import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CategoryFilter,
  ClothingCategory,
  ClothingColor,
  ClothingItem,
  ColorFamily,
  NewClothingItem,
  Season,
} from '../types/clothing';
import type { LocalBackupDatabaseImportResult, LocalBackupPayload } from '../types/backup';
import type { ClothingCloudFields, CloudSyncStatus } from '../types/sync';
import type { NewOutfit, Outfit, OutfitSticker } from '../types/outfit';
import type { FitEntry, NewFitEntry } from '../types/fit';
import { inferColorFamilyFromHex, resolveColorOption } from '../services/colorSearch';

const DATABASE_NAME = 'lookbookie.db';

type ClothingRow = {
  id: number;
  local_image_path: string;
  remote_image_url: string | null;
  remote_record_id: string | null;
  storage_path: string | null;
  name: string | null;
  brand: string | null;
  tags: string | null;
  fit_sizes: string | null;
  category: ClothingCategory;
  seasons: string | null;
  color: ClothingColor;
  color_value: string | null;
  color_family: ColorFamily | null;
  created_at: string;
  cloud_sync_status: CloudSyncStatus | null;
  cloud_error: string | null;
  synced_at: string | null;
};

type OutfitRow = {
  id: number;
  remote_record_id: string | null;
  name: string;
  seasons: string | null;
  tags: string | null;
  stickers: string;
  canvas_width: number | null;
  canvas_height: number | null;
  created_at: string;
  cloud_sync_status: CloudSyncStatus | null;
  cloud_error: string | null;
  synced_at: string | null;
};

type FitRow = {
  id: number;
  name: string | null;
  worn_on: string | null;
  local_image_path: string;
  remote_image_url: string | null;
  remote_record_id: string | null;
  storage_path: string | null;
  clothing_item_ids: string | null;
  outfit_id: number | null;
  created_at: string;
  cloud_sync_status: CloudSyncStatus | null;
  cloud_error: string | null;
  synced_at: string | null;
};

type TableColumn = {
  name: string;
};

let dbPromise: Promise<SQLiteDatabase> | null = null;

function getDatabase() {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return dbPromise;
}

export async function initDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS clothes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_image_path TEXT NOT NULL,
      brand TEXT,
      category TEXT NOT NULL,
      seasons TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS outfits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      stickers TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      local_image_path TEXT NOT NULL,
      clothing_item_ids TEXT NOT NULL DEFAULT '[]',
      outfit_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await ensureColumn(db, 'clothes', 'remote_image_url', 'TEXT');
  await ensureColumn(db, 'clothes', 'remote_record_id', 'TEXT');
  await ensureColumn(db, 'clothes', 'storage_path', 'TEXT');
  await ensureColumn(db, 'clothes', 'name', 'TEXT');
  await ensureColumn(db, 'clothes', 'tags', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, 'clothes', 'fit_sizes', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, 'clothes', 'color_value', 'TEXT');
  await ensureColumn(db, 'clothes', 'color_family', 'TEXT');
  await ensureColumn(db, 'clothes', 'cloud_sync_status', "TEXT NOT NULL DEFAULT 'local'");
  await ensureColumn(db, 'clothes', 'cloud_error', 'TEXT');
  await ensureColumn(db, 'clothes', 'synced_at', 'DATETIME');
  await ensureColumn(db, 'outfits', 'canvas_width', 'REAL');
  await ensureColumn(db, 'outfits', 'canvas_height', 'REAL');
  await ensureColumn(db, 'outfits', 'seasons', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, 'outfits', 'tags', "TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn(db, 'outfits', 'remote_record_id', 'TEXT');
  await ensureColumn(db, 'outfits', 'cloud_sync_status', "TEXT NOT NULL DEFAULT 'local'");
  await ensureColumn(db, 'outfits', 'cloud_error', 'TEXT');
  await ensureColumn(db, 'outfits', 'synced_at', 'DATETIME');
  await ensureColumn(db, 'fits', 'name', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, 'fits', 'worn_on', 'TEXT');
  await db.execAsync("UPDATE fits SET worn_on = date(created_at) WHERE worn_on IS NULL");
  await ensureColumn(db, 'fits', 'remote_image_url', 'TEXT');
  await ensureColumn(db, 'fits', 'remote_record_id', 'TEXT');
  await ensureColumn(db, 'fits', 'storage_path', 'TEXT');
  await ensureColumn(db, 'fits', 'cloud_sync_status', "TEXT NOT NULL DEFAULT 'local'");
  await ensureColumn(db, 'fits', 'cloud_error', 'TEXT');
  await ensureColumn(db, 'fits', 'synced_at', 'DATETIME');
}

export async function insertClothingItem(item: NewClothingItem) {
  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO clothes (
      local_image_path,
      remote_image_url,
      remote_record_id,
      storage_path,
	      name,
	      brand,
	      tags,
	      fit_sizes,
	      category,
	      seasons,
	      color,
	      color_value,
	      color_family,
	      cloud_sync_status,
	      cloud_error,
	      synced_at
	    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.localImagePath,
    item.remoteImageUrl ?? null,
    item.remoteRecordId ?? null,
    item.storagePath ?? null,
    item.name.trim(),
    item.brand.trim(),
    JSON.stringify(item.tags),
    JSON.stringify(item.fitSizes),
    item.category,
    JSON.stringify(item.seasons),
    item.color,
    item.colorValue,
    item.colorFamily,
    item.cloudSyncStatus ?? 'local',
    item.cloudError ?? null,
    item.syncedAt ?? null,
  );

  return result.lastInsertRowId;
}

export async function updateClothingItem(item: ClothingItem) {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE clothes
     SET local_image_path = ?,
         remote_image_url = ?,
         remote_record_id = ?,
	         storage_path = ?,
	         name = ?,
	         brand = ?,
	         tags = ?,
	         fit_sizes = ?,
	         category = ?,
	         seasons = ?,
	         color = ?,
	         color_value = ?,
	         color_family = ?,
	         cloud_sync_status = ?,
	         cloud_error = ?,
         synced_at = ?
     WHERE id = ?`,
    item.localImagePath,
    item.remoteImageUrl,
    item.remoteRecordId,
    item.storagePath,
    item.name.trim(),
    item.brand.trim(),
    JSON.stringify(item.tags),
    JSON.stringify(item.fitSizes),
    item.category,
    JSON.stringify(item.seasons),
    item.color,
    item.colorValue,
    item.colorFamily,
    item.cloudSyncStatus,
    item.cloudError,
    item.syncedAt,
    item.id,
  );
}

export async function deleteClothingItem(id: number) {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM clothes WHERE id = ?', id);
}

export async function renameClothingCategory(
  currentCategory: ClothingCategory,
  nextCategory: ClothingCategory,
) {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE clothes
     SET category = ?,
         cloud_sync_status = CASE
           WHEN remote_record_id IS NOT NULL THEN 'pending'
           ELSE cloud_sync_status
         END,
         cloud_error = NULL,
         synced_at = CASE
           WHEN remote_record_id IS NOT NULL THEN NULL
           ELSE synced_at
         END
     WHERE category = ?`,
    nextCategory,
    currentCategory,
  );
}

export async function renameClothingFitSize(currentValue: string, nextValue: string) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Pick<ClothingRow, 'id' | 'fit_sizes' | 'remote_record_id'>>(
    'SELECT id, fit_sizes, remote_record_id FROM clothes',
  );

  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const current = parseStringArray(row.fit_sizes);

      if (!current.includes(currentValue)) {
        continue;
      }

      const next = Array.from(
        new Set(current.map((value) => (value === currentValue ? nextValue : value))),
      );
      await db.runAsync(
        `UPDATE clothes
         SET fit_sizes = ?,
             cloud_sync_status = CASE WHEN remote_record_id IS NOT NULL THEN 'pending' ELSE cloud_sync_status END,
             cloud_error = NULL,
             synced_at = CASE WHEN remote_record_id IS NOT NULL THEN NULL ELSE synced_at END
         WHERE id = ?`,
        JSON.stringify(next),
        row.id,
      );
    }
  });
}

export async function listClothingItems(filter: CategoryFilter) {
  const db = await getDatabase();

  const rows =
    filter === '전체'
      ? await db.getAllAsync<ClothingRow>(
          'SELECT * FROM clothes ORDER BY datetime(created_at) DESC, id DESC',
        )
      : await db.getAllAsync<ClothingRow>(
          'SELECT * FROM clothes WHERE category = ? ORDER BY datetime(created_at) DESC, id DESC',
          filter,
        );

  return rows.map(mapClothingRow);
}

export async function insertOutfit(outfit: NewOutfit) {
  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO outfits (
      remote_record_id,
      name,
      seasons,
      tags,
      stickers,
      canvas_width,
      canvas_height,
      cloud_sync_status,
      cloud_error,
      synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    outfit.remoteRecordId ?? null,
    outfit.name,
    JSON.stringify(outfit.seasons),
    JSON.stringify(outfit.tags),
    JSON.stringify(outfit.stickers),
    outfit.canvasWidth ?? null,
    outfit.canvasHeight ?? null,
    outfit.cloudSyncStatus ?? 'local',
    outfit.cloudError ?? null,
    outfit.syncedAt ?? null,
  );

  return result.lastInsertRowId;
}

export async function updateOutfit(outfit: Outfit) {
  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE outfits
     SET remote_record_id = ?,
         name = ?,
         seasons = ?,
         tags = ?,
         stickers = ?,
         canvas_width = ?,
         canvas_height = ?,
         cloud_sync_status = ?,
         cloud_error = ?,
         synced_at = ?
     WHERE id = ?`,
    outfit.remoteRecordId,
    outfit.name,
    JSON.stringify(outfit.seasons),
    JSON.stringify(outfit.tags),
    JSON.stringify(outfit.stickers),
    outfit.canvasWidth ?? null,
    outfit.canvasHeight ?? null,
    outfit.cloudSyncStatus,
    outfit.cloudError,
    outfit.syncedAt,
    outfit.id,
  );

  if (result.changes !== 1) {
    throw new Error('수정할 로컬 코디를 찾지 못했어요.');
  }
}

export async function updateOutfitCloudState(
  id: number,
  fields: {
    remoteRecordId: string | null;
    cloudSyncStatus: CloudSyncStatus;
    cloudError: string | null;
    syncedAt: string | null;
  },
) {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE outfits
     SET remote_record_id = ?,
         cloud_sync_status = ?,
         cloud_error = ?,
         synced_at = ?
     WHERE id = ?`,
    fields.remoteRecordId,
    fields.cloudSyncStatus,
    fields.cloudError,
    fields.syncedAt,
    id,
  );
}

export async function deleteOutfit(id: number) {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM outfits WHERE id = ?', id);
  const remaining = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM outfits WHERE id = ?',
    id,
  );

  if ((remaining?.count ?? 0) > 0) {
    throw new Error('로컬 코디 삭제가 확인되지 않았어요.');
  }
}

export async function listOutfits() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OutfitRow>(
    'SELECT * FROM outfits ORDER BY datetime(created_at) DESC, id DESC',
  );

  return rows.map(mapOutfitRow);
}

export async function listOutfitsContainingClothingItem(clothingItemId: number) {
  const outfits = await listOutfits();

  return outfits.filter((outfit) =>
    outfit.stickers.some((sticker) => sticker.clothingItemId === clothingItemId),
  );
}

export async function countOutfits() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM outfits');

  return row?.count ?? 0;
}

export async function insertFitEntry(fit: NewFitEntry) {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO fits (
      name,
      worn_on,
      local_image_path,
      remote_image_url,
      remote_record_id,
      storage_path,
      clothing_item_ids,
      outfit_id,
      cloud_sync_status,
      cloud_error,
      synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    fit.name,
    fit.wornOn,
    fit.localImagePath,
    fit.remoteImageUrl,
    fit.remoteRecordId,
    fit.storagePath,
    JSON.stringify(fit.clothingItemIds),
    fit.outfitId,
    fit.cloudSyncStatus,
    fit.cloudError,
    fit.syncedAt,
  );

  return result.lastInsertRowId;
}

export async function updateFitEntry(fit: FitEntry) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE fits
     SET name = ?,
         worn_on = ?,
         local_image_path = ?,
         remote_image_url = ?,
         remote_record_id = ?,
         storage_path = ?,
         clothing_item_ids = ?,
         outfit_id = ?,
         cloud_sync_status = ?,
         cloud_error = ?,
         synced_at = ?
     WHERE id = ?`,
    fit.name,
    fit.wornOn,
    fit.localImagePath,
    fit.remoteImageUrl,
    fit.remoteRecordId,
    fit.storagePath,
    JSON.stringify(fit.clothingItemIds),
    fit.outfitId,
    fit.cloudSyncStatus,
    fit.cloudError,
    fit.syncedAt,
    fit.id,
  );
}

export async function updateFitCloudState(
  id: number,
  fields: Pick<
    FitEntry,
    | 'remoteImageUrl'
    | 'remoteRecordId'
    | 'storagePath'
    | 'cloudSyncStatus'
    | 'cloudError'
    | 'syncedAt'
  >,
) {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE fits
     SET remote_image_url = ?, remote_record_id = ?, storage_path = ?,
         cloud_sync_status = ?, cloud_error = ?, synced_at = ?
     WHERE id = ?`,
    fields.remoteImageUrl,
    fields.remoteRecordId,
    fields.storagePath,
    fields.cloudSyncStatus,
    fields.cloudError,
    fields.syncedAt,
    id,
  );
}

export async function listFitEntries() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<FitRow>(
    'SELECT * FROM fits ORDER BY datetime(created_at) DESC, id DESC',
  );
  return rows.map(mapFitRow);
}

export async function listFitsContainingClothingItem(clothingItemId: number) {
  const fits = await listFitEntries();
  return fits.filter((fit) => fit.clothingItemIds.includes(clothingItemId));
}

export async function listFitsForOutfit(outfitId: number) {
  const fits = await listFitEntries();
  return fits.filter((fit) => fit.outfitId === outfitId);
}

export async function countFits() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM fits');
  return row?.count ?? 0;
}

export async function listCloudPendingFitEntries() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<FitRow>(
    `SELECT * FROM fits
     WHERE cloud_sync_status IN ('pending', 'failed')
     ORDER BY datetime(created_at) ASC, id ASC`,
  );
  return rows.map(mapFitRow);
}

export async function countCloudPendingFitEntries() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM fits
     WHERE cloud_sync_status IN ('pending', 'failed')`,
  );
  return row?.count ?? 0;
}

export async function deleteFitEntry(id: number) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM fits WHERE id = ?', id);
}

export async function listCloudPendingClothingItems() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ClothingRow>(
    `SELECT * FROM clothes
     WHERE cloud_sync_status IN ('pending', 'failed')
     ORDER BY datetime(created_at) ASC, id ASC`,
  );

  return rows.map(mapClothingRow);
}

export async function countCloudPendingClothingItems() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM clothes
     WHERE cloud_sync_status IN ('pending', 'failed')`,
  );

  return row?.count ?? 0;
}

export async function detachAllLocalCloudData() {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE clothes
       SET remote_image_url = NULL,
           remote_record_id = NULL,
           storage_path = NULL,
           cloud_sync_status = 'local',
           cloud_error = NULL,
           synced_at = NULL`
    );
    await db.runAsync(
      `UPDATE outfits
       SET remote_record_id = NULL,
           cloud_sync_status = 'local',
           cloud_error = NULL,
           synced_at = NULL`
    );
    await db.runAsync(
      `UPDATE fits
       SET remote_image_url = NULL,
           remote_record_id = NULL,
           storage_path = NULL,
           cloud_sync_status = 'local',
           cloud_error = NULL,
           synced_at = NULL`,
    );
  });
}

export async function createLocalBackupPayload(): Promise<LocalBackupPayload> {
  const db = await getDatabase();
  const clothingRows = await db.getAllAsync<ClothingRow>(
    'SELECT * FROM clothes ORDER BY datetime(created_at) ASC, id ASC',
  );
  const outfitRows = await db.getAllAsync<OutfitRow>(
    'SELECT * FROM outfits ORDER BY datetime(created_at) ASC, id ASC',
  );
  const fitRows = await db.getAllAsync<FitRow>(
    'SELECT * FROM fits ORDER BY datetime(created_at) ASC, id ASC',
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    clothes: clothingRows.map(mapClothingRow),
    outfits: outfitRows.map(mapOutfitRow),
    fits: fitRows.map(mapFitRow),
  };
}

export async function importLocalBackupPayload(
  payload: LocalBackupPayload,
): Promise<LocalBackupDatabaseImportResult> {
  if (payload.version !== 1 || !Array.isArray(payload.clothes) || !Array.isArray(payload.outfits)) {
    throw new Error('지원하지 않는 백업 파일 형식이에요.');
  }

  let clothesCount = 0;
  let outfitsCount = 0;
  let fitsCount = 0;
  const clothingIdMap = new Map<number, number>();
  const outfitIdMap = new Map<number, number>();

  for (const item of payload.clothes) {
    const fallbackImagePath = item.localImagePath || item.remoteImageUrl;
    const fallbackColorOption = resolveColorOption(item.color);

    if (!fallbackImagePath) {
      continue;
    }

    const insertedId = await insertClothingItem({
      localImagePath: fallbackImagePath,
      remoteImageUrl: item.remoteImageUrl,
      remoteRecordId: item.remoteRecordId,
      storagePath: item.storagePath,
      name: item.name,
      brand: item.brand,
      tags: item.tags ?? [],
      fitSizes: item.fitSizes ?? [],
      category: item.category,
      seasons: item.seasons,
      color: item.color,
      colorValue: item.colorValue ?? fallbackColorOption.value,
      colorFamily: item.colorFamily ?? fallbackColorOption.family,
      cloudSyncStatus: item.remoteRecordId ? 'pending' : 'local',
      cloudError: null,
      syncedAt: null,
    });
    clothingIdMap.set(item.id, insertedId);
    clothesCount += 1;
  }

  for (const outfit of payload.outfits) {
    const restoredStickers = outfit.stickers.flatMap((sticker) => {
      const restoredClothingItemId = clothingIdMap.get(sticker.clothingItemId);

      return [{
        ...sticker,
        clothingItemId:
          restoredClothingItemId ?? -Math.max(1, Math.abs(sticker.clothingItemId)),
      }];
    });

    const insertedOutfitId = await insertOutfit({
      remoteRecordId: outfit.remoteRecordId ?? null,
      name: outfit.name,
      seasons: outfit.seasons ?? [],
      tags: outfit.tags ?? [],
      stickers: restoredStickers,
      canvasWidth: outfit.canvasWidth,
      canvasHeight: outfit.canvasHeight,
      cloudSyncStatus: outfit.remoteRecordId ? 'pending' : 'local',
      cloudError: null,
      syncedAt: null,
    });
    outfitIdMap.set(outfit.id, insertedOutfitId);
    outfitsCount += 1;
  }

  for (const fit of payload.fits ?? []) {
    const fallbackImagePath = fit.localImagePath || fit.remoteImageUrl;

    if (!fallbackImagePath) {
      continue;
    }

    await insertFitEntry({
      name: fit.name ?? '',
      wornOn: fit.wornOn ?? fit.createdAt.slice(0, 10),
      localImagePath: fallbackImagePath,
      remoteImageUrl: fit.remoteImageUrl ?? null,
      remoteRecordId: fit.remoteRecordId ?? null,
      storagePath: fit.storagePath ?? null,
      clothingItemIds: fit.clothingItemIds.map(
        (id) => clothingIdMap.get(id) ?? -Math.max(1, Math.abs(id)),
      ),
      outfitId: fit.outfitId === null ? null : outfitIdMap.get(fit.outfitId) ?? null,
      cloudSyncStatus: fit.remoteRecordId ? 'pending' : 'local',
      cloudError: null,
      syncedAt: null,
    });
    fitsCount += 1;
  }

  return {
    clothesCount,
    outfitsCount,
    fitsCount,
  };
}

export async function updateClothingCloudState(id: number, fields: ClothingCloudFields) {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE clothes
     SET remote_image_url = ?,
         remote_record_id = ?,
         storage_path = ?,
         cloud_sync_status = ?,
         cloud_error = ?,
         synced_at = ?
     WHERE id = ?`,
    fields.remoteImageUrl,
    fields.remoteRecordId,
    fields.storagePath,
    fields.cloudSyncStatus,
    fields.cloudError,
    fields.syncedAt,
    id,
  );
}

function mapClothingRow(row: ClothingRow): ClothingItem {
  const fallbackColorOption = resolveColorOption(row.color);
  const colorValue = row.color_value ?? fallbackColorOption.value;
  const colorFamily = row.color_family ?? inferColorFamilyFromHex(colorValue, row.color);

  return {
    id: row.id,
    localImagePath: row.local_image_path,
    remoteImageUrl: row.remote_image_url ?? null,
    remoteRecordId: row.remote_record_id ?? null,
    storagePath: row.storage_path ?? null,
    name: row.name ?? row.brand ?? '',
    brand: row.brand ?? '',
    tags: parseStringArray(row.tags),
    fitSizes: parseStringArray(row.fit_sizes),
    category: row.category,
    seasons: parseSeasons(row.seasons),
    color: row.color,
    colorValue,
    colorFamily,
    createdAt: row.created_at,
    cloudSyncStatus: row.cloud_sync_status ?? 'local',
    cloudError: row.cloud_error ?? null,
    syncedAt: row.synced_at ?? null,
  };
}

function parseSeasons(value: string | null): Season[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? (parsed as Season[]) : [];
  } catch {
    return [];
  }
}

function mapOutfitRow(row: OutfitRow): Outfit {
  return {
    id: row.id,
    remoteRecordId: row.remote_record_id ?? null,
    name: row.name,
    seasons: parseSeasons(row.seasons),
    tags: parseStringArray(row.tags),
    stickers: parseStickers(row.stickers),
    canvasWidth: row.canvas_width ?? null,
    canvasHeight: row.canvas_height ?? null,
    createdAt: row.created_at,
    cloudSyncStatus: row.cloud_sync_status ?? 'local',
    cloudError: row.cloud_error ?? null,
    syncedAt: row.synced_at ?? null,
  };
}

function mapFitRow(row: FitRow): FitEntry {
  return {
    id: row.id,
    name: row.name ?? '',
    wornOn: row.worn_on ?? row.created_at.slice(0, 10),
    localImagePath: row.local_image_path,
    remoteImageUrl: row.remote_image_url ?? null,
    remoteRecordId: row.remote_record_id ?? null,
    storagePath: row.storage_path ?? null,
    clothingItemIds: parseNumberArray(row.clothing_item_ids),
    outfitId: row.outfit_id ?? null,
    createdAt: row.created_at,
    cloudSyncStatus: row.cloud_sync_status ?? 'local',
    cloudError: row.cloud_error ?? null,
    syncedAt: row.synced_at ?? null,
  };
}

function parseStringArray(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

function parseNumberArray(value: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is number => typeof item === 'number' && Number.isFinite(item))
      : [];
  } catch {
    return [];
  }
}

function parseStickers(value: string): OutfitSticker[] {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((sticker): sticker is Record<string, unknown> =>
        Boolean(sticker && typeof sticker === 'object'),
      )
      .map((sticker, index) => ({
        ...sticker,
        id: typeof sticker.id === 'string' ? sticker.id : `restored-${index}`,
        clothingItemId: getFiniteNumber(sticker.clothingItemId, -1),
        localImagePath:
          typeof sticker.localImagePath === 'string' ? sticker.localImagePath : '',
        remoteImageUrl:
          typeof sticker.remoteImageUrl === 'string' ? sticker.remoteImageUrl : null,
        name: typeof sticker.name === 'string' ? sticker.name : '',
        brand: typeof sticker.brand === 'string' ? sticker.brand : '',
        category: typeof sticker.category === 'string' ? sticker.category : null,
        x: getFiniteNumber(sticker.x, 0),
        y: getFiniteNumber(sticker.y, 0),
        size: Math.max(1, getFiniteNumber(sticker.size, 96)),
        rotation: getFiniteNumber(sticker.rotation, 0),
        zIndex: getFiniteNumber(sticker.zIndex, index + 1),
      })) as OutfitSticker[];
  } catch {
    return [];
  }
}

function getFiniteNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

async function ensureColumn(
  db: SQLiteDatabase,
  tableName: 'clothes' | 'outfits' | 'fits',
  columnName: string,
  definition: string,
) {
  const columns = await db.getAllAsync<TableColumn>(`PRAGMA table_info(${tableName})`);

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
}
