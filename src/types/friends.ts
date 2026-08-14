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
  brand: string | null;
  category: ClothingCategory;
  seasons: Season[];
  color: ClothingColor;
  createdAt: string;
};
