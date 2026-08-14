import { useCallback, useEffect, useState } from 'react';

import { loadCategoryOptions, saveCategoryOptions } from '../storage/categoryOptions';
import { CLOTHING_CATEGORIES, type ClothingCategory } from '../types/clothing';

export function useCategoryOptions() {
  const [categoryOptions, setCategoryOptionsState] = useState<ClothingCategory[]>([
    ...CLOTHING_CATEGORIES,
  ]);

  const reloadCategoryOptions = useCallback(async () => {
    setCategoryOptionsState(await loadCategoryOptions());
  }, []);

  const setCategoryOptions = useCallback(async (nextOptions: ClothingCategory[]) => {
    await saveCategoryOptions(nextOptions);
    setCategoryOptionsState(nextOptions);
  }, []);

  useEffect(() => {
    reloadCategoryOptions();
  }, [reloadCategoryOptions]);

  return {
    categoryOptions,
    reloadCategoryOptions,
    setCategoryOptions,
  };
}
