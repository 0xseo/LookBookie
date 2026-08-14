import { useCallback, useEffect, useMemo, useState } from 'react';

import { mergeColorOptions } from '../services/colorSearch';
import {
  loadColorOptionOrder,
  loadCustomColorOptions,
  saveColorOptionOrder,
  saveCustomColorOptions,
} from '../storage/colorPalette';
import { COLOR_OPTIONS, type ColorOption } from '../types/clothing';

export function useColorPaletteOptions() {
  const [customColorOptions, setCustomColorOptionsState] = useState<ColorOption[]>([]);
  const [colorOptionOrder, setColorOptionOrderState] = useState<string[]>([]);
  const colorOptions = useMemo(
    () => orderColorOptions(
      mergeColorOptions([...customColorOptions, ...COLOR_OPTIONS]),
      colorOptionOrder,
    ),
    [colorOptionOrder, customColorOptions],
  );

  const reloadColorOptions = useCallback(async () => {
    const [storedOptions, storedOrder] = await Promise.all([
      loadCustomColorOptions(),
      loadColorOptionOrder(),
    ]);

    setCustomColorOptionsState(storedOptions);
    setColorOptionOrderState(storedOrder);
  }, []);

  const setCustomColorOptions = useCallback(async (nextOptions: ColorOption[]) => {
    await saveCustomColorOptions(nextOptions);
    setCustomColorOptionsState(nextOptions);
  }, []);

  const setColorOptionOrder = useCallback(async (labels: string[]) => {
    await saveColorOptionOrder(labels);
    setColorOptionOrderState(labels);
  }, []);

  useEffect(() => {
    reloadColorOptions();
  }, [reloadColorOptions]);

  return {
    colorOptions,
    colorOptionOrder,
    customColorOptions,
    reloadColorOptions,
    setColorOptionOrder,
    setCustomColorOptions,
  };
}

function orderColorOptions(options: ColorOption[], labels: string[]) {
  const orderByLabel = new Map(labels.map((label, index) => [label, index]));

  return [...options].sort((left, right) => {
    const leftIndex = orderByLabel.get(left.label) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = orderByLabel.get(right.label) ?? Number.MAX_SAFE_INTEGER;

    return leftIndex - rightIndex;
  });
}
