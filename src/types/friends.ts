import type { ClothingCategory, ClothingColor, ColorFamily, Season } from './clothing';

export type FriendshipStatus = 'pending' | 'accepted';

export type FriendRequestDirection = 'incoming' | 'outgoing';

export type FriendProfile = {
  id: string;
  email: string;
  displayName: string | null;
};

export type FriendRequest = FriendProfile & {
  friendshipId: string;
  direction: FriendRequestDirection;
  status: FriendshipStatus;
  createdAt: string;
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
  colorValue: string | null;
  colorFamily: ColorFamily | null;
  createdAt: string;
};

export type FriendOutfitSticker = {
  remoteImageUrl: string | null;
  name: string | null;
  brand: string | null;
  category: ClothingCategory | null;
  color: ClothingColor | null;
  colorValue: string | null;
  colorFamily: ColorFamily | null;
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
  seasons: Season[];
  stickers: FriendOutfitSticker[];
  canvasWidth: number | null;
  canvasHeight: number | null;
  createdAt: string;
};
