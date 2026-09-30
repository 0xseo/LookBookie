import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_FIT_SIZE_OPTIONS } from '../types/clothing';

const FIT_SIZE_STORAGE_KEY = 'lookboogie.fit-size-options.v1';

export async function loadFitSizeOptions() {
  try {
    const storedValue = await AsyncStorage.getItem(FIT_SIZE_STORAGE_KEY);

    if (!storedValue) {
      return [...DEFAULT_FIT_SIZE_OPTIONS];
    }

    const parsed = JSON.parse(storedValue);
    const options = Array.isArray(parsed) ? sanitizeOptions(parsed) : [];

    return options.length > 0 ? options : [...DEFAULT_FIT_SIZE_OPTIONS];
  } catch {
    return [...DEFAULT_FIT_SIZE_OPTIONS];
  }
}

export async function saveFitSizeOptions(options: readonly string[]) {
  const safeOptions = sanitizeOptions(options);

  if (safeOptions.length === 0) {
    throw new Error('핏/사이즈 옵션은 한 개 이상 있어야 해요.');
  }

  await AsyncStorage.setItem(FIT_SIZE_STORAGE_KEY, JSON.stringify(safeOptions));
}

function sanitizeOptions(values: readonly unknown[]) {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    if (typeof value !== 'string') {
      return [];
    }

    const option = value.trim();

    if (!option || seen.has(option)) {
      return [];
    }

    seen.add(option);
    return [option];
  });
}
