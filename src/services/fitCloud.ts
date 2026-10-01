import type { ClothingItem } from '../types/clothing';
import type { FitEntry, NewFitEntry } from '../types/fit';
import type { Outfit } from '../types/outfit';
import { isSupabaseConfigured, supabase, supabaseStorageBucket } from './supabaseClient';

import { listFitEntries, updateFitCloudState } from '../storage/database';

type FitCloudState = Pick<
  FitEntry,
  | 'remoteImageUrl'
  | 'remoteRecordId'
  | 'storagePath'
  | 'cloudSyncStatus'
  | 'cloudError'
  | 'syncedAt'
>;

const pendingFitSyncs = new Map<number, Promise<FitCloudState | null>>();

// Serialize each local record, including new records that do not have a remote ID yet.
export function syncStoredFitToCloud(id: number, clothes: ClothingItem[], outfits: Outfit[]): Promise<FitCloudState | null> {
  const previous = pendingFitSyncs.get(id);
  const job = (previous ?? Promise.resolve()).catch(() => null).then(async () => {
    const fit = (await listFitEntries()).find((entry) => entry.id === id);
    if (!fit) return null;
    const state = await syncFitToCloud(fit, clothes, outfits, false);
    const latest = (await listFitEntries()).find((entry) => entry.id === id);
    if (!latest) {
      if (state.remoteRecordId) await deleteFitFromCloud({ ...fit, ...state });
      return null;
    }
    const imageMatches = latest.localImagePath === fit.localImagePath;
    const unchanged = imageMatches && latest.name === fit.name && latest.wornOn === fit.wornOn
      && latest.outfitId === fit.outfitId && JSON.stringify(latest.clothingItemIds) === JSON.stringify(fit.clothingItemIds);
    const nextState: FitCloudState = unchanged ? state : {
      ...state,
      remoteImageUrl: imageMatches ? state.remoteImageUrl : latest.remoteImageUrl,
      cloudSyncStatus: 'pending',
      cloudError: null,
      syncedAt: null,
    };
    await updateFitCloudState(id, nextState);
    return nextState;
  });
  pendingFitSyncs.set(id, job);
  void job.finally(() => { if (pendingFitSyncs.get(id) === job) pendingFitSyncs.delete(id); }).catch(() => { });
  return job;
}

export async function syncFitToCloud(
  fit: NewFitEntry | FitEntry,
  clothes: ClothingItem[],
  outfits: Outfit[],
  imageChanged: boolean,
): Promise<FitCloudState> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      remoteImageUrl: fit.remoteImageUrl,
      remoteRecordId: fit.remoteRecordId,
      storagePath: fit.storagePath,
      cloudSyncStatus: fit.remoteRecordId ? 'pending' : 'local',
      cloudError: null,
      syncedAt: null,
    };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  if (sessionError || !user) {
    return buildFailedState(fit, sessionError?.message ?? 'Supabase login required', 'pending');
  }

  const clothesById = new Map(clothes.map((item) => [item.id, item]));
  const outfit = outfits.find((item) => item.id === fit.outfitId);
  const payload = {
    name: fit.name,
    worn_on: fit.wornOn,
    clothing_record_ids: fit.clothingItemIds.flatMap((id) => {
      const remoteId = clothesById.get(id)?.remoteRecordId;
      return remoteId ? [remoteId] : [];
    }),
    outfit_record_id: outfit?.remoteRecordId ?? null,
  };

  try {
    const upload = imageChanged || !fit.remoteImageUrl
      ? await uploadFitImage(user.id, fit.localImagePath)
      : { publicUrl: fit.remoteImageUrl, storagePath: fit.storagePath };

    if (fit.remoteRecordId) {
      const { data, error } = await supabase
        .from('fits')
        .update({
          remote_image_url: upload.publicUrl ?? undefined,
          storage_path: upload.storagePath ?? undefined,
          ...payload,
        })
        .eq('id', fit.remoteRecordId)
        .eq('owner_id', user.id)
        .select('id')
        .maybeSingle();

      if (error) throw error;
      if (data) return buildSyncedState(data.id, upload.publicUrl, upload.storagePath);
    }

    if (!upload.publicUrl || !upload.storagePath) {
      throw new Error('마이핏 이미지를 클라우드에 올리지 못했어요.');
    }

    const { data, error } = await supabase
      .from('fits')
      .insert({
        owner_id: user.id,
        remote_image_url: upload.publicUrl,
        storage_path: upload.storagePath,
        ...payload,
      })
      .select('id')
      .single();

    if (error) throw error;
    return buildSyncedState(data.id, upload.publicUrl, upload.storagePath);
  } catch (error) {
    return buildFailedState(
      fit,
      error instanceof Error ? error.message : 'Unknown fit sync error',
      'failed',
    );
  }
}

export async function deleteFitFromCloud(fit: FitEntry) {
  if (!supabase || !fit.remoteRecordId) return;

  const { error } = await supabase.from('fits').delete().eq('id', fit.remoteRecordId);
  if (error) throw error;

  if (fit.storagePath) {
    await supabase.storage.from(supabaseStorageBucket).remove([fit.storagePath]);
  }
}

async function uploadFitImage(userId: string, localImagePath: string) {
  if (!supabase) throw new Error('Supabase client is not configured.');

  const extension = getFileExtension(localImagePath);
  const storagePath = `${userId}/fits/fit-${Date.now()}.${extension}`;
  const response = await fetch(localImagePath);
  const arrayBuffer = await response.arrayBuffer();
  const { data, error } = await supabase.storage
    .from(supabaseStorageBucket)
    .upload(storagePath, arrayBuffer, {
      contentType: extension === 'png' ? 'image/png' : 'image/jpeg',
      upsert: false,
    });

  if (error) throw error;
  return {
    storagePath: data.path,
    publicUrl: supabase.storage.from(supabaseStorageBucket).getPublicUrl(data.path).data.publicUrl,
  };
}

function buildSyncedState(
  remoteRecordId: string,
  remoteImageUrl: string | null,
  storagePath: string | null,
): FitCloudState {
  return {
    remoteImageUrl,
    remoteRecordId,
    storagePath,
    cloudSyncStatus: 'synced',
    cloudError: null,
    syncedAt: new Date().toISOString(),
  };
}

function buildFailedState(
  fit: NewFitEntry | FitEntry,
  message: string,
  status: 'pending' | 'failed',
): FitCloudState {
  return {
    remoteImageUrl: fit.remoteImageUrl,
    remoteRecordId: fit.remoteRecordId,
    storagePath: fit.storagePath,
    cloudSyncStatus: status,
    cloudError: message,
    syncedAt: null,
  };
}

function getFileExtension(uri: string) {
  const extension = uri.split('?')[0]?.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();
  return extension === 'jpeg' ? 'jpg' : extension || 'png';
}
