import type { ClothingItem, ColorOption } from '../types/clothing';
import type { FitEntry } from '../types/fit';
import type { FriendWardrobeItem } from '../types/friends';
import type { Outfit } from '../types/outfit';
import { dateSearchTerms } from './collectionControls';
import { getColorSearchTerms, resolveColorOption } from './colorSearch';

type SearchOutfit = Pick<Outfit, 'name' | 'tags' | 'seasons'> & {
  stickers: Array<{ name: string | null; brand: string | null; category: string | null; }>;
};
export function fitMatchesSearch(
  fit: Pick<FitEntry, 'name' | 'wornOn'>,
  query: string,
  outfit: SearchOutfit | undefined,
  clothes: Array<ClothingItem | FriendWardrobeItem>,
  colorOptions: readonly ColorOption[],
) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const terms = [
    fit.name,
    dateSearchTerms(fit.wornOn),
    outfit?.name,
    ...(outfit?.tags ?? []),
    ...(outfit?.seasons ?? []),
    ...(outfit?.stickers.flatMap((sticker) => [sticker.name, sticker.brand, sticker.category]) ?? []),
    ...clothes.flatMap((item) => [item.name, item.brand, item.category, ...item.tags, ...item.fitSizes, ...item.seasons, ...getColorSearchTerms({ color: item.color, colorValue: item.colorValue ?? '', colorFamily: item.colorFamily ?? resolveColorOption(item.color, colorOptions).family }, colorOptions)]),
  ].join(' ').toLowerCase();
  return terms.includes(normalized);
}
