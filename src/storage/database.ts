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
import type { LocalBackupImportResult, LocalBackupPayload } from '../types/backup';
import type { ClothingCloudFields, CloudSyncStatus } from '../types/sync';
import type { NewOutfit, Outfit, OutfitSticker } from '../types/outfit';
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
  name: string;
  stickers: string;
  canvas_width: number | null;
  canvas_height: number | null;
  created_at: string;
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
  `);

  await ensureColumn(db, 'clothes', 'remote_image_url', 'TEXT');
  await ensureColumn(db, 'clothes', 'remote_record_id', 'TEXT');
  await ensureColumn(db, 'clothes', 'storage_path', 'TEXT');
  await ensureColumn(db, 'clothes', 'name', 'TEXT');
  await ensureColumn(db, 'clothes', 'color_value', 'TEXT');
  await ensureColumn(db, 'clothes', 'color_family', 'TEXT');
  await ensureColumn(db, 'clothes', 'cloud_sync_status', "TEXT NOT NULL DEFAULT 'local'");
  await ensureColumn(db, 'clothes', 'cloud_error', 'TEXT');
  await ensureColumn(db, 'clothes', 'synced_at', 'DATETIME');
  await ensureColumn(db, 'outfits', 'canvas_width', 'REAL');
  await ensureColumn(db, 'outfits', 'canvas_height', 'REAL');
}

export async function insertClothingItem(item: NewClothingItem) {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO clothes (
      local_image_path,
      remote_image_url,
      remote_record_id,
      storage_path,
	      name,
	      brand,
	      category,
	      seasons,
	      color,
	      color_value,
	      color_family,
	      cloud_sync_status,
	      cloud_error,
	      synced_at
	    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    item.localImagePath,
    item.remoteImageUrl ?? null,
    item.remoteRecordId ?? null,
    item.storagePath ?? null,
    item.name.trim(),
    item.brand.trim(),
    item.category,
    JSON.stringify(item.seasons),
    item.color,
    item.colorValue,
    item.colorFamily,
    item.cloudSyncStatus ?? 'local',
    item.cloudError ?? null,
    item.syncedAt ?? null,
  );
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

  await db.runAsync(
    'INSERT INTO outfits (name, stickers, canvas_width, canvas_height) VALUES (?, ?, ?, ?)',
    outfit.name,
    JSON.stringify(outfit.stickers),
    outfit.canvasWidth ?? null,
    outfit.canvasHeight ?? null,
  );
}

export async function updateOutfit(outfit: Outfit) {
  const db = await getDatabase();

  await db.runAsync(
    'UPDATE outfits SET name = ?, stickers = ?, canvas_width = ?, canvas_height = ? WHERE id = ?',
    outfit.name,
    JSON.stringify(outfit.stickers),
    outfit.canvasWidth ?? null,
    outfit.canvasHeight ?? null,
    outfit.id,
  );
}

export async function deleteOutfit(id: number) {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM outfits WHERE id = ?', id);
}

export async function listOutfits() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<OutfitRow>(
    'SELECT * FROM outfits ORDER BY datetime(created_at) DESC, id DESC',
  );

  return rows.map(mapOutfitRow);
}

export async function countOutfits() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM outfits');

  return row?.count ?? 0;
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

export async function createLocalBackupPayload(): Promise<LocalBackupPayload> {
  const db = await getDatabase();
  const clothingRows = await db.getAllAsync<ClothingRow>(
    'SELECT * FROM clothes ORDER BY datetime(created_at) ASC, id ASC',
  );
  const outfitRows = await db.getAllAsync<OutfitRow>(
    'SELECT * FROM outfits ORDER BY datetime(created_at) ASC, id ASC',
  );

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    clothes: clothingRows.map(mapClothingRow),
    outfits: outfitRows.map(mapOutfitRow),
  };
}

export async function importLocalBackupPayload(
  payload: LocalBackupPayload,
): Promise<LocalBackupImportResult> {
  if (payload.version !== 1 || !Array.isArray(payload.clothes) || !Array.isArray(payload.outfits)) {
    throw new Error('지원하지 않는 백업 파일 형식이에요.');
  }

  let clothesCount = 0;
  let outfitsCount = 0;

  for (const item of payload.clothes) {
    const fallbackImagePath = item.localImagePath || item.remoteImageUrl;
    const fallbackColorOption = resolveColorOption(item.color);

    if (!fallbackImagePath) {
      continue;
    }

    await insertClothingItem({
      localImagePath: fallbackImagePath,
      remoteImageUrl: item.remoteImageUrl,
      remoteRecordId: item.remoteRecordId,
      storagePath: item.storagePath,
      name: item.name,
      brand: item.brand,
      category: item.category,
      seasons: item.seasons,
      color: item.color,
      colorValue: item.colorValue ?? fallbackColorOption.value,
      colorFamily: item.colorFamily ?? fallbackColorOption.family,
      cloudSyncStatus: item.cloudSyncStatus,
      cloudError: item.cloudError,
      syncedAt: item.syncedAt,
    });
    clothesCount += 1;
  }

  for (const outfit of payload.outfits) {
    await insertOutfit({
      name: outfit.name,
      stickers: outfit.stickers,
      canvasWidth: outfit.canvasWidth,
      canvasHeight: outfit.canvasHeight,
    });
    outfitsCount += 1;
  }

  return {
    clothesCount,
    outfitsCount,
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
    name: row.name,
    stickers: parseStickers(row.stickers),
    canvasWidth: row.canvas_width ?? null,
    canvasHeight: row.canvas_height ?? null,
    createdAt: row.created_at,
  };
}

function parseStickers(value: string): OutfitSticker[] {
  try {
    const parsed = JSON.parse(value);

    return Array.isArray(parsed) ? (parsed as OutfitSticker[]) : [];
  } catch {
    return [];
  }
}

async function ensureColumn(
  db: SQLiteDatabase,
  tableName: 'clothes' | 'outfits',
  columnName: string,
  definition: string,
) {
  const columns = await db.getAllAsync<TableColumn>(`PRAGMA table_info(${tableName})`);

  if (columns.some((column) => column.name === columnName)) {
    return;
  }

  await db.execAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition};`);
}
