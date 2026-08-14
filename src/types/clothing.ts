import type { CloudSyncStatus } from './sync';

export const CLOTHING_CATEGORIES = ['상의', '하의', '아우터', '신발', '악세사리', '원피스'] as const;
export const CATEGORY_FILTERS = ['전체', ...CLOTHING_CATEGORIES] as const;
export const SEASONS = ['봄', '여름', '가을', '겨울'] as const;

export type ColorOption = {
  label: string;
  value: string;
};

export const COLOR_OPTIONS = [
  { label: '블랙', value: '#1A1D1E' },
  { label: '화이트', value: '#FFFFFF' },
  { label: '그레이', value: '#6C757D' },
  { label: '아이보리', value: '#F6F1E7' },
  { label: '베이지', value: '#D4A373' },
  { label: '브라운', value: '#7A5C45' },
  { label: '그린', value: '#3A5A40' },
  { label: '네이비', value: '#243B53' },
  { label: '블루', value: '#4A6FA5' },
  { label: '데님', value: '#2F5F8F' },
  { label: '레드', value: '#E63946' },
  { label: '옐로우', value: '#F2C94C' },
  { label: '핑크', value: '#E8A2B8' },
  { label: '퍼플', value: '#7C5C99' },
] as const satisfies readonly ColorOption[];

export type ClothingCategory = (typeof CLOTHING_CATEGORIES)[number] | (string & {});
export type CategoryFilter = '전체' | ClothingCategory;
export type Season = (typeof SEASONS)[number];
export type ClothingColor = string;

export type ClothingItem = {
  id: number;
  localImagePath: string;
  remoteImageUrl: string | null;
  remoteRecordId: string | null;
  storagePath: string | null;
  brand: string;
  category: ClothingCategory;
  seasons: Season[];
  color: ClothingColor;
  createdAt: string;
  cloudSyncStatus: CloudSyncStatus;
  cloudError: string | null;
  syncedAt: string | null;
};

export type NewClothingItem = {
  localImagePath: string;
  remoteImageUrl?: string | null;
  remoteRecordId?: string | null;
  storagePath?: string | null;
  brand: string;
  category: ClothingCategory;
  seasons: Season[];
  color: ClothingColor;
  cloudSyncStatus?: CloudSyncStatus;
  cloudError?: string | null;
  syncedAt?: string | null;
};
