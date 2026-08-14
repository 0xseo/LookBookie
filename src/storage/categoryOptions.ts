import AsyncStorage from '@react-native-async-storage/async-storage';

import { CLOTHING_CATEGORIES, type ClothingCategory } from '../types/clothing';

const CATEGORY_STORAGE_KEY = 'lookboogie.categories.v1';

export async function loadCategoryOptions(): Promise<ClothingCategory[]> {
  try {
    const storedValue = await AsyncStorage.getItem(CATEGORY_STORAGE_KEY);

    if (!storedValue) {
      return [...CLOTHING_CATEGORIES];
    }

    const parsed = JSON.parse(storedValue);

    if (!Array.isArray(parsed)) {
      return [...CLOTHING_CATEGORIES];
    }

    const categories = sanitizeCategories(parsed);

    return categories.length > 0 ? categories : [...CLOTHING_CATEGORIES];
  } catch {
    return [...CLOTHING_CATEGORIES];
  }
}

export async function saveCategoryOptions(categories: readonly ClothingCategory[]) {
  const safeCategories = sanitizeCategories(categories);

  if (safeCategories.length === 0) {
    throw new Error('카테고리는 한 개 이상 있어야 해요.');
  }

  await AsyncStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(safeCategories));
}

function sanitizeCategories(values: readonly unknown[]): ClothingCategory[] {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    if (typeof value !== 'string') {
      return [];
    }

    const category = value.trim();

    if (!category || seen.has(category)) {
      return [];
    }

    seen.add(category);
    return [category as ClothingCategory];
  });
}
