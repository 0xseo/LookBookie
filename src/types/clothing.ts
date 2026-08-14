import type { CloudSyncStatus } from './sync';

export const CLOTHING_CATEGORIES = ['상의', '하의', '아우터', '신발', '악세사리', '원피스'] as const;
export const CATEGORY_FILTERS = ['전체', ...CLOTHING_CATEGORIES] as const;
export const SEASONS = ['봄', '여름', '가을', '겨울'] as const;

export const COLOR_FAMILIES = [
  'black',
  'white',
  'gray',
  'beige',
  'brown',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'pink',
  'purple',
] as const;

export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export type ColorOption = {
  label: string;
  value: string;
  family: ColorFamily;
  aliases?: string[];
};

export const COLOR_OPTIONS = [
  { label: '블랙', value: '#1A1D1E', family: 'black', aliases: ['검정', '검은색', 'black'] },
  { label: '화이트', value: '#FFFFFF', family: 'white', aliases: ['흰색', '하양', 'white'] },
  { label: '그레이', value: '#6C757D', family: 'gray', aliases: ['회색', 'gray', 'grey'] },
  { label: '아이보리', value: '#F6F1E7', family: 'beige', aliases: ['크림', '오트밀', 'ivory'] },
  { label: '베이지', value: '#D4A373', family: 'beige', aliases: ['카멜', '샌드', 'beige'] },
  { label: '브라운', value: '#7A5C45', family: 'brown', aliases: ['갈색', '초코', 'brown'] },
  { label: '그린', value: '#3A5A40', family: 'green', aliases: ['초록', '카키', 'green'] },
  { label: '네이비', value: '#243B53', family: 'blue', aliases: ['남색', 'navy'] },
  { label: '블루', value: '#4A6FA5', family: 'blue', aliases: ['파랑', '파란색', 'blue'] },
  { label: '데님', value: '#2F5F8F', family: 'blue', aliases: ['청', '청색', 'denim'] },
  { label: '레드', value: '#E63946', family: 'red', aliases: ['빨강', '빨간색', '버건디', '와인', 'red'] },
  { label: '오렌지', value: '#F2994A', family: 'orange', aliases: ['주황', 'orange'] },
  { label: '옐로우', value: '#F2C94C', family: 'yellow', aliases: ['노랑', '노란색', 'yellow'] },
  { label: '핑크', value: '#E8A2B8', family: 'pink', aliases: ['분홍', 'pink'] },
  { label: '퍼플', value: '#7C5C99', family: 'purple', aliases: ['보라', 'purple'] },
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
  name: string;
  brand: string;
  category: ClothingCategory;
  seasons: Season[];
  color: ClothingColor;
  colorValue: string;
  colorFamily: ColorFamily;
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
  name: string;
  brand: string;
  category: ClothingCategory;
  seasons: Season[];
  color: ClothingColor;
  colorValue: string;
  colorFamily: ColorFamily;
  cloudSyncStatus?: CloudSyncStatus;
  cloudError?: string | null;
  syncedAt?: string | null;
};
