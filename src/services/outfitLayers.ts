import type { OutfitSticker } from "../types/outfit";

export type StickerLayerDirection = "front" | "forward" | "backward" | "back";

// The input is normalized into back-to-front order by the canvas.
export function moveStickerLayer(
  orderedStickers: OutfitSticker[],
  id: string,
  direction: StickerLayerDirection
) {
  const currentIndex = orderedStickers.findIndex((sticker) => sticker.id === id);
  if (currentIndex < 0) return orderedStickers;

  const lastIndex = orderedStickers.length - 1;
  const nextIndex = direction === "front"
    ? lastIndex
    : direction === "back"
      ? 0
      : direction === "forward"
        ? Math.min(currentIndex + 1, lastIndex)
        : Math.max(currentIndex - 1, 0);

  if (currentIndex === nextIndex) return orderedStickers;

  const reordered = [...orderedStickers];
  const [sticker] = reordered.splice(currentIndex, 1);
  reordered.splice(nextIndex, 0, sticker);
  return reordered.map((item, index) => ({ ...item, zIndex: index + 1 }));
}
