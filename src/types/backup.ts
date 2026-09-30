import type { ClothingItem } from './clothing';
import type { Outfit } from './outfit';
import type { FitEntry } from './fit';

export type LocalBackupPayload = {
  version: 1;
  exportedAt: string;
  clothes: ClothingItem[];
  outfits: Outfit[];
  fits?: FitEntry[];
};

export type LocalBackupImportResult = {
  clothesCount: number;
  outfitsCount: number;
  fitsCount: number;
  downloadedImageCount: number;
  remoteFallbackImageCount: number;
  skippedImageCount: number;
};

export type LocalBackupDatabaseImportResult = Pick<
  LocalBackupImportResult,
  'clothesCount' | 'outfitsCount' | 'fitsCount'
>;
