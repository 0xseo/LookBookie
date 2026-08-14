import type { Season } from './clothing';

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
  seasons: Season[];
  stickers: OutfitSticker[];
  canvasWidth: number | null;
  canvasHeight: number | null;
  createdAt: string;
};

export type NewOutfit = {
  name: string;
  seasons: Season[];
  stickers: OutfitSticker[];
  canvasWidth?: number | null;
  canvasHeight?: number | null;
};
