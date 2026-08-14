export const CLOTHING_CATEGORIES = ['상의', '하의', '아우터', '신발', '악세사리'] as const;
export const CATEGORY_FILTERS = ['전체', ...CLOTHING_CATEGORIES] as const;
export const SEASONS = ['봄', '여름', '가을', '겨울'] as const;

export const COLOR_OPTIONS = [
  { label: '블랙', value: '#1A1D1E' },
  { label: '화이트', value: '#FFFFFF' },
  { label: '그레이', value: '#6C757D' },
  { label: '그린', value: '#3A5A40' },
  { label: '베이지', value: '#D4A373' },
  { label: '블루', value: '#4A6FA5' },
  { label: '레드', value: '#E63946' },
  { label: '옐로우', value: '#F2C94C' },
] as const;

export type ClothingCategory = (typeof CLOTHING_CATEGORIES)[number];
export type CategoryFilter = (typeof CATEGORY_FILTERS)[number];
export type Season = (typeof SEASONS)[number];
export type ClothingColor = (typeof COLOR_OPTIONS)[number]['label'];

export type ClothingItem = {
  id: number;
  localImagePath: string;
  brand: string;
  category: ClothingCategory;
  seasons: Season[];
  color: ClothingColor;
  createdAt: string;
};

export type NewClothingItem = {
  localImagePath: string;
  brand: string;
  category: ClothingCategory;
  seasons: Season[];
  color: ClothingColor;
};
