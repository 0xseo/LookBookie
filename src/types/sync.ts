export type CloudSyncStatus = 'local' | 'pending' | 'synced' | 'failed';

export type ClothingCloudFields = {
  remoteImageUrl: string | null;
  remoteRecordId: string | null;
  storagePath: string | null;
  cloudSyncStatus: CloudSyncStatus;
  cloudError: string | null;
  syncedAt: string | null;
};

export type CloudSyncResult = ClothingCloudFields;
