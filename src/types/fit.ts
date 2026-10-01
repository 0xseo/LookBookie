import type { CloudSyncStatus } from './sync';

export type FitEntry = {
  id: number;
  name: string;
  wornOn: string;
  localImagePath: string;
  remoteImageUrl: string | null;
  remoteRecordId: string | null;
  storagePath: string | null;
  clothingItemIds: number[];
  outfitId: number | null;
  createdAt: string;
  cloudSyncStatus: CloudSyncStatus;
  cloudError: string | null;
  syncedAt: string | null;
};

export type NewFitEntry = Omit<FitEntry, 'id' | 'createdAt'>;
