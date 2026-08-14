import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import type { NewClothingItem } from '../types/clothing';
import type { CloudSyncResult } from '../types/sync';
import { isSupabaseConfigured, supabase, supabaseStorageBucket } from './supabaseClient';

const NOT_CONFIGURED_RESULT: CloudSyncResult = {
  remoteImageUrl: null,
  remoteRecordId: null,
  storagePath: null,
  cloudSyncStatus: 'local',
  cloudError: null,
  syncedAt: null,
};

export async function getCurrentCloudSession() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  return data.session;
}

export function subscribeToCloudAuthChanges(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  if (!supabase) {
    return () => undefined;
  }

  const { data } = supabase.auth.onAuthStateChange(callback);

  return () => data.subscription.unsubscribe();
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase 환경변수가 설정되지 않았어요.');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw error;
  }
}

export async function signUpWithEmail(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase 환경변수가 설정되지 않았어요.');
  }

  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    throw error;
  }
}

export async function signOutCloud() {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function syncClothingItemToCloud(item: NewClothingItem): Promise<CloudSyncResult> {
  if (!isSupabaseConfigured || !supabase) {
    return NOT_CONFIGURED_RESULT;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return {
      ...NOT_CONFIGURED_RESULT,
      cloudSyncStatus: 'pending',
      cloudError: sessionError.message,
    };
  }

  if (!session?.user) {
    return {
      ...NOT_CONFIGURED_RESULT,
      cloudSyncStatus: 'pending',
      cloudError: 'Supabase login required',
    };
  }

  try {
    const user = session.user;
    const uploadResult = await uploadClothingImage(user.id, item.localImagePath);
    const { data, error } = await supabase
      .from('clothes')
      .insert({
        owner_id: user.id,
        remote_image_url: uploadResult.publicUrl,
        storage_path: uploadResult.storagePath,
        brand: item.brand.trim() || null,
        category: item.category,
        seasons: item.seasons,
        color: item.color,
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return {
      remoteImageUrl: uploadResult.publicUrl,
      remoteRecordId: data.id,
      storagePath: uploadResult.storagePath,
      cloudSyncStatus: 'synced',
      cloudError: null,
      syncedAt: new Date().toISOString(),
    };
  } catch (error) {
    return buildFailedResult(error instanceof Error ? error.message : 'Unknown cloud sync error');
  }
}

async function uploadClothingImage(userId: string, localImagePath: string) {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const fileExtension = getFileExtension(localImagePath);
  const storagePath = `${userId}/wardrobe/clothing-${Date.now()}.${fileExtension}`;
  const response = await fetch(localImagePath);
  const arrayBuffer = await response.arrayBuffer();
  const { data, error } = await supabase.storage
    .from(supabaseStorageBucket)
    .upload(storagePath, arrayBuffer, {
      contentType: getContentType(fileExtension),
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const publicUrl = supabase.storage.from(supabaseStorageBucket).getPublicUrl(data.path)
    .data.publicUrl;

  return {
    storagePath: data.path,
    publicUrl,
  };
}

function buildFailedResult(message: string): CloudSyncResult {
  return {
    remoteImageUrl: null,
    remoteRecordId: null,
    storagePath: null,
    cloudSyncStatus: 'failed',
    cloudError: message,
    syncedAt: null,
  };
}

function getFileExtension(uri: string) {
  const cleanUri = uri.split('?')[0] ?? uri;
  const extension = cleanUri.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase();

  return extension === 'jpeg' ? 'jpg' : extension || 'png';
}

function getContentType(extension: string) {
  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return 'image/png';
}
