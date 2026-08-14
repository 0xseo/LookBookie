import type { ClothingItem, Season } from '../types/clothing';
import type { OutfitSticker } from '../types/outfit';
import { isSupabaseConfigured, supabase } from './supabaseClient';

type SyncOutfitInput = {
  remoteRecordId: string | null;
  name: string;
  seasons: Season[];
  stickers: OutfitSticker[];
  wardrobeItems: ClothingItem[];
  canvasWidth: number | null;
  canvasHeight: number | null;
  allowLegacyMatch?: boolean;
  removeLegacyDuplicates?: boolean;
};

export type SyncOutfitResult = {
  remoteRecordId: string | null;
  cloudSyncStatus: 'local' | 'synced' | 'pending' | 'failed';
  cloudError: string | null;
  syncedAt: string | null;
};

export async function syncOutfitToCloud({
  remoteRecordId,
  name,
  seasons,
  stickers,
  wardrobeItems,
  canvasWidth,
  canvasHeight,
  allowLegacyMatch = false,
  removeLegacyDuplicates = false,
}: SyncOutfitInput): Promise<SyncOutfitResult> {
  if (!isSupabaseConfigured || !supabase) {
    return buildLocalResult(remoteRecordId);
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return buildFailedResult(remoteRecordId, sessionError.message);
  }

  if (!session?.user) {
    return {
      remoteRecordId,
      cloudSyncStatus: 'pending',
      cloudError: 'Supabase login required',
      syncedAt: null,
    };
  }

  const payload = buildCloudOutfitPayload(
    session.user.id,
    name,
    seasons,
    stickers,
    wardrobeItems,
    canvasWidth,
    canvasHeight,
  );
  const { owner_id: _ownerId, ...updatePayload } = payload;

  try {
    let targetRecordId = remoteRecordId;
    let legacyDuplicateIds: string[] = [];

    if (!targetRecordId && allowLegacyMatch) {
      const { data: legacyRows, error: legacyError } = await supabase
        .from('outfits')
        .select('id')
        .eq('owner_id', session.user.id)
        .eq('name', name)
        .order('created_at', { ascending: false });

      if (legacyError) {
        throw legacyError;
      }

      targetRecordId = legacyRows[0]?.id ?? null;
      legacyDuplicateIds = legacyRows.slice(1).map((row) => row.id);
    }

    if (targetRecordId) {
      const { data: updated, error: updateError } = await supabase
        .from('outfits')
        .update(updatePayload)
        .eq('id', targetRecordId)
        .eq('owner_id', session.user.id)
        .select('id')
        .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (updated) {
        if (removeLegacyDuplicates && legacyDuplicateIds.length > 0) {
          const { error: cleanupError } = await supabase
            .from('outfits')
            .delete()
            .eq('owner_id', session.user.id)
            .in('id', legacyDuplicateIds);

          if (cleanupError) {
            throw cleanupError;
          }
        }

        return buildSyncedResult(updated.id);
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from('outfits')
      .insert(payload)
      .select('id')
      .single();

    if (insertError) {
      throw insertError;
    }

    return buildSyncedResult(inserted.id);
  } catch (error) {
    return buildFailedResult(
      remoteRecordId,
      error instanceof Error ? error.message : 'Unknown outfit sync error',
    );
  }
}

export async function deleteOutfitFromCloud(
  remoteRecordId: string | null,
  legacyName: string,
) {
  if (!isSupabaseConfigured || !supabase) {
    if (remoteRecordId) {
      throw new Error('클라우드 설정이 없어 원격 코디를 삭제할 수 없어요.');
    }

    return;
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session?.user) {
    throw new Error('원격 코디를 확인하고 삭제하려면 로그인이 필요해요.');
  }

  let deleteQuery = supabase.from('outfits').delete().eq('owner_id', session.user.id);
  deleteQuery = remoteRecordId
    ? deleteQuery.eq('id', remoteRecordId)
    : deleteQuery.eq('name', legacyName);
  const { error } = await deleteQuery;

  if (error) {
    throw error;
  }

  let verificationQuery = supabase
    .from('outfits')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', session.user.id);
  verificationQuery = remoteRecordId
    ? verificationQuery.eq('id', remoteRecordId)
    : verificationQuery.eq('name', legacyName);
  const { count, error: verificationError } = await verificationQuery;

  if (verificationError) {
    throw verificationError;
  }

  if ((count ?? 0) > 0) {
    throw new Error('원격 코디 삭제가 확인되지 않았어요. 다시 시도해 주세요.');
  }
}

function buildCloudOutfitPayload(
  ownerId: string,
  name: string,
  seasons: Season[],
  stickers: OutfitSticker[],
  wardrobeItems: ClothingItem[],
  canvasWidth: number | null,
  canvasHeight: number | null,
) {
  const wardrobeById = new Map(wardrobeItems.map((item) => [item.id, item]));
  const cloudStickers = stickers.map((sticker) => {
    const wardrobeItem = wardrobeById.get(sticker.clothingItemId);

    return {
      remoteImageUrl: wardrobeItem?.remoteImageUrl ?? null,
      name: wardrobeItem?.name ?? null,
      brand: wardrobeItem?.brand ?? null,
      category: wardrobeItem?.category ?? null,
      color: wardrobeItem?.color ?? null,
      colorValue: wardrobeItem?.colorValue ?? null,
      colorFamily: wardrobeItem?.colorFamily ?? null,
      x: sticker.x,
      y: sticker.y,
      size: sticker.size,
      rotation: sticker.rotation,
      zIndex: sticker.zIndex,
    };
  });

  return {
    owner_id: ownerId,
    name,
    seasons,
    stickers: cloudStickers,
    canvas_width: canvasWidth,
    canvas_height: canvasHeight,
  };
}

function buildSyncedResult(remoteRecordId: string): SyncOutfitResult {
  return {
    remoteRecordId,
    cloudSyncStatus: 'synced',
    cloudError: null,
    syncedAt: new Date().toISOString(),
  };
}

function buildLocalResult(remoteRecordId: string | null): SyncOutfitResult {
  return {
    remoteRecordId,
    cloudSyncStatus: remoteRecordId ? 'pending' : 'local',
    cloudError: null,
    syncedAt: null,
  };
}

function buildFailedResult(remoteRecordId: string | null, message: string): SyncOutfitResult {
  return {
    remoteRecordId,
    cloudSyncStatus: 'failed',
    cloudError: message,
    syncedAt: null,
  };
}
