import {
  COLOR_FAMILIES,
  COLOR_OPTIONS,
  type ColorFamily,
  type ColorOption,
  type ClothingItem,
} from '../types/clothing';

export const COLOR_FAMILY_OPTIONS: Array<{
  family: ColorFamily;
  label: string;
  aliases: string[];
}> = [
  { family: 'black', label: '블랙', aliases: ['검정', '검은색', 'black'] },
  { family: 'white', label: '화이트', aliases: ['흰색', '하양', 'white'] },
  { family: 'gray', label: '그레이', aliases: ['회색', 'gray', 'grey'] },
  { family: 'beige', label: '베이지', aliases: ['아이보리', '크림', '오트밀', 'beige'] },
  { family: 'brown', label: '브라운', aliases: ['갈색', '카멜', '초코', 'brown'] },
  { family: 'red', label: '레드', aliases: ['빨강', '빨간색', '버건디', '와인', 'red'] },
  { family: 'orange', label: '오렌지', aliases: ['주황', 'orange'] },
  { family: 'yellow', label: '옐로우', aliases: ['노랑', '노란색', 'yellow'] },
  { family: 'green', label: '그린', aliases: ['초록', '카키', 'green'] },
  { family: 'blue', label: '블루', aliases: ['파랑', '남색', '네이비', '데님', 'blue', 'navy'] },
  { family: 'pink', label: '핑크', aliases: ['분홍', 'pink'] },
  { family: 'purple', label: '퍼플', aliases: ['보라', 'purple'] },
];

const FALLBACK_COLOR_OPTION = COLOR_OPTIONS[0];

export function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}

export function sanitizeColorOption(option: Partial<ColorOption>): ColorOption | null {
  const value = normalizeHex(option.value ?? '');
  const label = option.label?.trim();

  if (!label || !value) {
    return null;
  }

  const family = isColorFamily(option.family)
    ? option.family
    : inferColorFamilyFromHex(value, label);

  return {
    label,
    value,
    family,
    aliases: option.aliases?.filter((alias) => alias.trim().length > 0),
  };
}

export function mergeColorOptions(options: readonly ColorOption[]) {
  const seenLabels = new Set<string>();

  return options.filter((option) => {
    if (seenLabels.has(option.label)) {
      return false;
    }

    seenLabels.add(option.label);
    return true;
  });
}

export function resolveColorOption(
  label: string,
  options: readonly ColorOption[] = COLOR_OPTIONS,
): ColorOption {
  const directMatch = options.find((option) => option.label === label);

  if (directMatch) {
    return directMatch;
  }

  return {
    label: label || FALLBACK_COLOR_OPTION.label,
    value: FALLBACK_COLOR_OPTION.value,
    family: inferColorFamilyFromHex(FALLBACK_COLOR_OPTION.value, label),
  };
}

export function findNearestColorOption(hex: string, options: readonly ColorOption[]) {
  const normalizedHex = normalizeHex(hex);

  if (!normalizedHex) {
    return FALLBACK_COLOR_OPTION;
  }

  return options.reduce((nearest, option) => {
    const nearestDistance = colorDistance(normalizedHex, nearest.value);
    const optionDistance = colorDistance(normalizedHex, option.value);

    return optionDistance < nearestDistance ? option : nearest;
  }, options[0] ?? FALLBACK_COLOR_OPTION);
}

export function clothingMatchesSearch(
  item: ClothingItem,
  query: string,
  colorOptions: readonly ColorOption[],
) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return true;
  }

  const colorTerms = getColorSearchTerms(item, colorOptions);
  const searchableText = [
    item.name,
    item.brand,
    item.category,
    item.color,
    item.colorValue,
    item.colorFamily,
    ...item.seasons,
    ...colorTerms,
  ]
    .join(' ')
    .toLowerCase();

  return searchableText.includes(normalizedQuery);
}

export function getColorSearchTerms(
  item: Pick<ClothingItem, 'color' | 'colorValue' | 'colorFamily'>,
  colorOptions: readonly ColorOption[],
) {
  const option = resolveColorOption(item.color, colorOptions);
  const familyOption =
    COLOR_FAMILY_OPTIONS.find((family) => family.family === item.colorFamily) ??
    COLOR_FAMILY_OPTIONS.find((family) => family.family === option.family);

  return [
    option.label,
    option.value,
    option.family,
    item.colorValue,
    item.colorFamily,
    ...(option.aliases ?? []),
    familyOption?.label,
    ...(familyOption?.aliases ?? []),
  ].filter((term): term is string => Boolean(term));
}

export function getColorFamilyLabel(family: ColorFamily) {
  return COLOR_FAMILY_OPTIONS.find((option) => option.family === family)?.label ?? family;
}

export function inferColorFamilyFromHex(hex: string, label = ''): ColorFamily {
  const normalizedHex = normalizeHex(hex);
  const normalizedLabel = normalizeSearchText(label);
  const familyFromLabel = COLOR_FAMILY_OPTIONS.find((option) =>
    [option.label, option.family, ...option.aliases].some((term) =>
      normalizedLabel.includes(normalizeSearchText(term)),
    ),
  );

  if (familyFromLabel) {
    return familyFromLabel.family;
  }

  if (!normalizedHex) {
    return 'black';
  }

  const { r, g, b } = hexToRgb(normalizedHex);
  const { h, s, l } = rgbToHsl(r, g, b);

  if (l < 0.16) {
    return 'black';
  }

  if (s < 0.12) {
    return l > 0.82 ? 'white' : 'gray';
  }

  if (l > 0.9 && s < 0.24) {
    return 'white';
  }

  if (h < 15 || h >= 345) {
    return 'red';
  }

  if (h < 35) {
    return l < 0.48 ? 'brown' : 'orange';
  }

  if (h < 55) {
    return l < 0.46 ? 'brown' : 'beige';
  }

  if (h < 72) {
    return 'yellow';
  }

  if (h < 165) {
    return 'green';
  }

  if (h < 250) {
    return 'blue';
  }

  if (h < 290) {
    return 'purple';
  }

  if (h < 345) {
    return 'pink';
  }

  return 'red';
}

export function normalizeHex(value: string) {
  const match = value.trim().match(/^#?([0-9A-Fa-f]{6})$/);

  return match?.[1] ? `#${match[1].toUpperCase()}` : null;
}

function isColorFamily(value: unknown): value is ColorFamily {
  return typeof value === 'string' && COLOR_FAMILIES.includes(value as ColorFamily);
}

function colorDistance(hexA: string, hexB: string) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);

  return (
    (a.r - b.r) * (a.r - b.r) +
    (a.g - b.g) * (a.g - b.g) +
    (a.b - b.b) * (a.b - b.b)
  );
}

function hexToRgb(hex: string) {
  const value = normalizeHex(hex) ?? FALLBACK_COLOR_OPTION.value;
  const intValue = Number.parseInt(value.slice(1), 16);

  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
}

function rgbToHsl(r: number, g: number, b: number) {
  const nextR = r / 255;
  const nextG = g / 255;
  const nextB = b / 255;
  const max = Math.max(nextR, nextG, nextB);
  const min = Math.min(nextR, nextG, nextB);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const delta = max - min;
  const s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let h = 0;

  if (max === nextR) {
    h = (nextG - nextB) / delta + (nextG < nextB ? 6 : 0);
  } else if (max === nextG) {
    h = (nextB - nextR) / delta + 2;
  } else {
    h = (nextR - nextG) / delta + 4;
  }

  return {
    h: h * 60,
    s,
    l,
  };
}
