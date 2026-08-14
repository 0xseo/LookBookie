import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ColorOption } from '../types/clothing';
import { sanitizeColorOption } from '../services/colorSearch';

const CUSTOM_COLOR_STORAGE_KEY = 'lookboogie.customColors.v1';

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

    return parsed
      .map((value) => (isRecord(value) ? sanitizeColorOption(value) : null))
      .filter((option): option is ColorOption => Boolean(option));
  } catch {
    return [];
  }
}

export async function saveCustomColorOptions(options: ColorOption[]) {
  const safeOptions = options
    .map((option) => sanitizeColorOption(option))
    .filter((option): option is ColorOption => Boolean(option));

  await AsyncStorage.setItem(CUSTOM_COLOR_STORAGE_KEY, JSON.stringify(safeOptions));
}

function isRecord(value: unknown): value is Partial<ColorOption> {
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
