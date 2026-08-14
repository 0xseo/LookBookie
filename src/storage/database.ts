import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CategoryFilter,
  ClothingCategory,
  ClothingColor,
  ClothingItem,
  NewClothingItem,
  Season,
} from '../types/clothing';
import type { NewOutfit, Outfit, OutfitSticker } from '../types/outfit';

const DATABASE_NAME = 'lookbookie.db';

type ClothingRow = {
  id: number;
  local_image_path: string;
  brand: string | null;
  category: ClothingCategory;
  seasons: string | null;
  color: ClothingColor;
  created_at: string;
};

type OutfitRow = {
  id: number;
  name: string;
  stickers: string;
  created_at: string;
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
}

export async function insertClothingItem(item: NewClothingItem) {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO clothes (
      local_image_path,
      brand,
      category,
      seasons,
      color
    ) VALUES (?, ?, ?, ?, ?)`,
    item.localImagePath,
    item.brand.trim(),
    item.category,
    JSON.stringify(item.seasons),
    item.color,
  );
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
    'INSERT INTO outfits (name, stickers) VALUES (?, ?)',
    outfit.name,
    JSON.stringify(outfit.stickers),
  );
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

function mapClothingRow(row: ClothingRow): ClothingItem {
  return {
    id: row.id,
    localImagePath: row.local_image_path,
    brand: row.brand ?? '',
    category: row.category,
    seasons: parseSeasons(row.seasons),
    color: row.color,
    createdAt: row.created_at,
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
