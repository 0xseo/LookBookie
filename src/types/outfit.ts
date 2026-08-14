export type OutfitSticker = {
  id: string;
  clothingItemId: number;
  localImagePath: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
  zIndex: number;
};

export type Outfit = {
  id: number;
  name: string;
  stickers: OutfitSticker[];
  canvasWidth: number | null;
  canvasHeight: number | null;
  createdAt: string;
};

export type NewOutfit = {
  name: string;
  stickers: OutfitSticker[];
  canvasWidth?: number | null;
  canvasHeight?: number | null;
};
