import type { ClothingCategory, ClothingColor, Season } from './clothing';

export type FriendProfile = {
  id: string;
  email: string;
  displayName: string | null;
};

export type FriendWardrobeItem = {
  id: string;
  ownerId: string;
  remoteImageUrl: string;
  name: string | null;
  brand: string | null;
  category: ClothingCategory;
  seasons: Season[];
  color: ClothingColor;
  createdAt: string;
};

export type FriendOutfitSticker = {
  remoteImageUrl: string | null;
  name: string | null;
  brand: string | null;
  category: ClothingCategory | null;
  color: ClothingColor | null;
  x: number;
  y: number;
  size: number;
  rotation: number;
  zIndex: number;
};

export type FriendOutfit = {
  id: string;
  ownerId: string;
  name: string;
  stickers: FriendOutfitSticker[];
  createdAt: string;
};
