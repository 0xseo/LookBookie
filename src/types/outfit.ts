import type { ClothingCategory, Season } from './clothing';
import type { CloudSyncStatus } from './sync';

export type OutfitSticker = {
  id: string;
  clothingItemId: number;
  localImagePath: string;
  remoteImageUrl: string | null;
  name: string;
  brand: string;
  category: ClothingCategory | null;
  x: number;
  y: number;
  size: number;
  rotation: number;
  zIndex: number;
};

export type Outfit = {
  id: number;
  remoteRecordId: string | null;
  name: string;
  seasons: Season[];
  tags: string[];
  stickers: OutfitSticker[];
  canvasWidth: number | null;
  canvasHeight: number | null;
  createdAt: string;
  cloudSyncStatus: CloudSyncStatus;
  cloudError: string | null;
  syncedAt: string | null;
};

export type NewOutfit = {
  remoteRecordId?: string | null;
  name: string;
  seasons: Season[];
  tags: string[];
  stickers: OutfitSticker[];
  canvasWidth?: number | null;
  canvasHeight?: number | null;
  cloudSyncStatus?: CloudSyncStatus;
  cloudError?: string | null;
  syncedAt?: string | null;
};
