// Runs database/date/preview regressions with the real SQLite engine, without Expo.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');
const modules = new Map();
const sqlite = new DatabaseSync(':memory:');
const db = {
  execAsync: async (sql) => sqlite.exec(sql),
  runAsync: async (sql, ...params) => {
    const result = sqlite.prepare(sql).run(...params);
    return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
  },
  getAllAsync: async (sql, ...params) => sqlite.prepare(sql).all(...params),
  getFirstAsync: async (sql, ...params) => sqlite.prepare(sql).get(...params),
  withTransactionAsync: async (operation) => { sqlite.exec('BEGIN'); try { await operation(); sqlite.exec('COMMIT'); } catch (error) { sqlite.exec('ROLLBACK'); throw error; } },
};
function load(file) {
  const filename = path.resolve(__dirname, '..', file);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  function requireModule(name) {
    if (name === 'expo-sqlite') return { openDatabaseAsync: async () => db };
    if (name === 'react-native') return { StyleSheet: { create: (styles) => styles } };
    if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null };
    if (name.startsWith('.')) {
      const resolved = path.resolve(path.dirname(filename), name);
      const extension = ['.ts', '.tsx'].find((ext) => fs.existsSync(resolved + ext));
      return load(path.relative(path.resolve(__dirname, '..'), resolved + extension));
    }
    return require(name);
  }
  vm.runInNewContext(source, { module, exports: module.exports, require: requireModule, Date, Set, Map, console, fetch: async () => ({ arrayBuffer: async () => new ArrayBuffer(8) }) }, { filename });
  return module.exports;
}
(async () => {
  // Upgrade a pre-metadata database, including legacy records, twice.
  sqlite.exec("CREATE TABLE fits (id INTEGER PRIMARY KEY AUTOINCREMENT, local_image_path TEXT NOT NULL, clothing_item_ids TEXT NOT NULL DEFAULT '[]', outfit_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP); INSERT INTO fits(local_image_path,created_at) VALUES ('legacy.png','2025-01-31 03:14:00');");
  const storage = load('src/storage/database.ts');
  await storage.initDatabase();
  await storage.initDatabase();
  const legacy = (await storage.listFitEntries())[0];
  assert.equal(legacy.name, '');
  assert.equal(legacy.wornOn, '2025-01-31');
  const draft = { name: '가을 산책', wornOn: '2026-09-29', localImagePath: 'fit.png', remoteImageUrl: null, remoteRecordId: null, storagePath: null, clothingItemIds: [11, 12], outfitId: null, cloudSyncStatus: 'local', cloudError: null, syncedAt: null };
  const id = await storage.insertFitEntry(draft);
  let saved = (await storage.listFitEntries()).find((fit) => fit.id === id);
  assert.equal(saved.name, draft.name);
  assert.equal(saved.wornOn, draft.wornOn);
  assert.deepEqual(Array.from(saved.clothingItemIds), [11, 12]);
  await storage.updateFitEntry({ ...saved, name: '출근룩', wornOn: '2026-10-01' });
  saved = (await storage.listFitEntries()).find((fit) => fit.id === id);
  assert.equal(saved.name, '출근룩');
  assert.equal(saved.wornOn, '2026-10-01');
  await storage.updateFitCloudState(id, { remoteImageUrl: 'https://example.com/fit.png', remoteRecordId: 'fit-record', storagePath: 'owner/fit.png', cloudSyncStatus: 'synced', cloudError: null, syncedAt: '2026-10-01T00:00:00Z' });
  const backup = await storage.createLocalBackupPayload();
  assert.equal(backup.fits.find((fit) => fit.id === id).wornOn, '2026-10-01');
  const imported = await storage.importLocalBackupPayload(backup);
  assert.equal(imported.fitsCount, 2);
  const rows = await storage.listFitEntries();
  assert.equal(rows.filter((fit) => fit.name === '출근룩' && fit.wornOn === '2026-10-01').length, 2);
  const oldBackup = { ...backup, fits: [{ ...legacy, name: undefined, wornOn: undefined }] };
  await storage.importLocalBackupPayload(oldBackup);
  assert.equal((await storage.listFitEntries()).filter((fit) => fit.wornOn === '2025-01-31').length, 3);
  const controls = load('src/services/collectionControls.ts');
  assert.equal(controls.isValidDate('2024-02-29'), true);
  for (const date of ['2026-02-29', '2026-13-01', '2026-09-31', '2026-1-1']) assert.equal(controls.isValidDate(date), false);
  assert(controls.dateSearchTerms('2026-10-01').includes('20261001'));
  const filters = { seasons: ['가을'], colors: ['블랙'], dateFrom: '2026-09-01', dateTo: '2026-10-01' };
  assert(controls.matchesCollectionFilters(filters, ['가을'], ['블랙'], '2026-10-01'));
  assert(!controls.matchesCollectionFilters(filters, ['여름'], ['블랙'], '2026-10-01'));
  assert(!controls.matchesCollectionFilters(filters, ['가을'], ['화이트'], '2026-10-01'));
  assert(!controls.matchesCollectionFilters(filters, ['가을'], ['블랙'], '2026-10-02'));
  assert(controls.compareCollection('createdDesc', { name: '', date: '2026-10-01', id: 2 }, { name: '', date: '2026-09-30', id: 1 }) < 0);
  assert(controls.compareCollection('nameAsc', { name: '가', date: '', id: 1 }, { name: '나', date: '', id: 2 }) < 0);
  const search = load('src/services/fitSearch.ts');
  const outfit = { name: '가을 코디', seasons: ['가을'], tags: ['미니멀'], stickers: [{ name: '삭제된 셔츠', brand: '이전 브랜드', category: '상의' }] };
  const clothes = [{ name: '니트', brand: '무신사', category: '상의', seasons: ['가을'], tags: ['출근'], fitSizes: ['L'], color: '블랙', colorValue: '#000000', colorFamily: 'black' }];
  const fit = { name: '산책', wornOn: '2026-10-01' };
  for (const query of ['산책', '2026-10-01', '2026.10.01', '20261001', '2026년 10월 1일', '가을 코디', '니트', '무신사', '출근', 'black', '삭제된 셔츠']) assert(search.fitMatchesSearch(fit, query, outfit, clothes, []), `Missing search match: ${query}`);
  assert(!search.fitMatchesSearch(fit, '없는 이름', outfit, clothes, []));
  const preview = load('src/components/OutfitPreview.tsx');
  const stickers = [{ x: -80, y: 500, size: 200, rotation: 45, zIndex: 0 }, { x: 200, y: 0, size: 100, rotation: 0, zIndex: 1 }];
  const layout = preview.getOutfitPreviewLayout(stickers, 300, 400, 88);
  for (const sticker of stickers) {
    const extent = sticker.size * (Math.abs(Math.cos(sticker.rotation * Math.PI / 180)) + Math.abs(Math.sin(sticker.rotation * Math.PI / 180))) / 2;
    const x = layout.offsetX + (sticker.x + sticker.size / 2 - layout.minX) * layout.scale;
    const y = layout.offsetY + (sticker.y + sticker.size / 2 - layout.minY) * layout.scale;
    assert(x - extent * layout.scale >= -0.01 && x + extent * layout.scale <= 88.01);
    assert(y - extent * layout.scale >= -0.01 && y + extent * layout.scale <= 88.01);
  }
  // Hold the first request while editing again; both jobs must update one remote row.
  const remoteRows = new Map();
  let insertCount = 0, uploadCount = 0, releaseFirst;
  const firstRequest = new Promise((resolve) => { releaseFirst = resolve; });
  let authStarted;
  const started = new Promise((resolve) => { authStarted = resolve; });
  let authCalls = 0;
  const cloud = {
    auth: { getSession: async () => { if (++authCalls === 1) { authStarted(); await firstRequest; } return { data: { session: { user: { id: 'owner' } } }, error: null }; } },
    from: () => ({
      insert: (payload) => ({ select: () => ({ single: async () => { const id = `remote-${++insertCount}`; remoteRows.set(id, payload); return { data: { id }, error: null }; } }) }),
      update: (payload) => {
        let remoteId;
        const builder = { eq: (column, value) => { if (column === 'id') remoteId = value; return builder; }, select: () => builder, maybeSingle: async () => { if (!remoteRows.has(remoteId)) return { data: null, error: null }; remoteRows.set(remoteId, { ...remoteRows.get(remoteId), ...payload }); return { data: { id: remoteId }, error: null }; } };
        return builder;
      },
    }),
    storage: { from: () => ({ upload: async (path) => { uploadCount++; return { data: { path }, error: null }; }, getPublicUrl: (path) => ({ data: { publicUrl: `https://example.com/${path}` } }) }) },
  };
  modules.set(path.resolve(__dirname, '../src/services/supabaseClient.ts'), { exports: { supabase: cloud, isSupabaseConfigured: true, supabaseStorageBucket: 'clothes' } });
  const fitCloud = load('src/services/fitCloud.ts');
  const first = fitCloud.syncStoredFitToCloud(id, [], []);
  await started;
  const current = (await storage.listFitEntries()).find((fit) => fit.id === id);
  await storage.updateFitEntry({ ...current, name: '다시 편집', localImagePath: 'edited-fit.png', remoteImageUrl: null, cloudSyncStatus: 'pending' });
  const second = fitCloud.syncStoredFitToCloud(id, [], []);
  releaseFirst();
  await Promise.all([first, second]);
  const finalFit = (await storage.listFitEntries()).find((fit) => fit.id === id);
  assert.equal(insertCount, 1);
  assert.equal(uploadCount, 1);
  assert.equal(remoteRows.get(finalFit.remoteRecordId).name, '다시 편집');
  assert.equal(finalFit.cloudSyncStatus, 'synced');
  assert(finalFit.remoteImageUrl.startsWith('https://example.com/owner/fits/'));
  console.log('Passed: legacy SQLite upgrade, fit create/edit/cloud state, JSON backup/import, dates/search/filters/sorts full rotated outfit previews and serialized edited-image cloud retries.');
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => sqlite.close());
