import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ColorOption } from '../types/clothing';
import { sanitizeColorOption } from '../services/colorSearch';

const CUSTOM_COLOR_STORAGE_KEY = 'lookboogie.customColors.v1';
const COLOR_ORDER_STORAGE_KEY = 'lookboogie.colorOrder.v1';

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

export async function loadColorOptionOrder(): Promise<string[]> {
  try {
    const storedValue = await AsyncStorage.getItem(COLOR_ORDER_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsed = JSON.parse(storedValue);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return sanitizeOrder(parsed);
  } catch {
    return [];
  }
}

export async function saveColorOptionOrder(labels: readonly string[]) {
  await AsyncStorage.setItem(COLOR_ORDER_STORAGE_KEY, JSON.stringify(sanitizeOrder(labels)));
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

function sanitizeOrder(values: readonly unknown[]) {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    if (typeof value !== 'string') {
      return [];
    }

    const label = value.trim();

    if (!label || seen.has(label)) {
      return [];
    }

    seen.add(label);
    return [label];
  });
}
