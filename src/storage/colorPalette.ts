import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ColorOption } from '../types/clothing';

const CUSTOM_COLOR_STORAGE_KEY = 'lookbookie.customColors.v1';

export async function loadCustomColorOptions() {
  try {
    const storedValue = await AsyncStorage.getItem(CUSTOM_COLOR_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsed = JSON.parse(storedValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isColorOption);
  } catch {
    return [];
  }
}

export async function saveCustomColorOptions(options: ColorOption[]) {
  await AsyncStorage.setItem(CUSTOM_COLOR_STORAGE_KEY, JSON.stringify(options));
}

function isColorOption(value: unknown): value is ColorOption {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const option = value as Partial<ColorOption>;

  return (
    typeof option.label === 'string' &&
    option.label.trim().length > 0 &&
    typeof option.value === 'string' &&
    /^#[0-9A-Fa-f]{6}$/.test(option.value)
  );
}
