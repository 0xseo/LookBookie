import type { ClothingItem } from './clothing';
import type { Outfit } from './outfit';

export type LocalBackupPayload = {
  version: 1;
  exportedAt: string;
  clothes: ClothingItem[];
  outfits: Outfit[];
};

export type LocalBackupImportResult = {
  clothesCount: number;
  outfitsCount: number;
  downloadedImageCount: number;
  remoteFallbackImageCount: number;
  skippedImageCount: number;
};

export type LocalBackupDatabaseImportResult = Pick<
  LocalBackupImportResult,
  'clothesCount' | 'outfitsCount'
>;
