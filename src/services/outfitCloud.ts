import type { ClothingItem } from '../types/clothing';
import type { OutfitSticker } from '../types/outfit';
import { isSupabaseConfigured, supabase } from './supabaseClient';

type SyncOutfitInput = {
  name: string;
  stickers: OutfitSticker[];
  wardrobeItems: ClothingItem[];
};

type SyncOutfitResult = {
  synced: boolean;
  reason: 'synced' | 'not-configured' | 'signed-out' | 'failed';
  error: string | null;
};

export async function syncOutfitToCloud({
  name,
  stickers,
  wardrobeItems,
}: SyncOutfitInput): Promise<SyncOutfitResult> {
  if (!isSupabaseConfigured || !supabase) {
    return { synced: false, reason: 'not-configured', error: null };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    return { synced: false, reason: 'failed', error: sessionError.message };
  }

  if (!session?.user) {
    return { synced: false, reason: 'signed-out', error: null };
  }

  const wardrobeById = new Map(wardrobeItems.map((item) => [item.id, item]));
  const cloudStickers = stickers.map((sticker) => {
    const wardrobeItem = wardrobeById.get(sticker.clothingItemId);

    return {
      remoteImageUrl: wardrobeItem?.remoteImageUrl ?? null,
      name: wardrobeItem?.name ?? null,
      brand: wardrobeItem?.brand ?? null,
      category: wardrobeItem?.category ?? null,
      color: wardrobeItem?.color ?? null,
      x: sticker.x,
      y: sticker.y,
      size: sticker.size,
      rotation: sticker.rotation,
      zIndex: sticker.zIndex,
    };
  });

  const { error } = await supabase.from('outfits').insert({
    owner_id: session.user.id,
    name,
    stickers: cloudStickers,
  });

  if (error) {
    return { synced: false, reason: 'failed', error: error.message };
  }

  return { synced: true, reason: 'synced', error: null };
}
