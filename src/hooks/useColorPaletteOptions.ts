import { useCallback, useEffect, useMemo, useState } from 'react';

import { mergeColorOptions } from '../services/colorSearch';
import { loadCustomColorOptions, saveCustomColorOptions } from '../storage/colorPalette';
import { COLOR_OPTIONS, type ColorOption } from '../types/clothing';

export function useColorPaletteOptions() {
  const [customColorOptions, setCustomColorOptionsState] = useState<ColorOption[]>([]);
  const colorOptions = useMemo(
    () => mergeColorOptions([...COLOR_OPTIONS, ...customColorOptions]),
    [customColorOptions],
  );

  const reloadColorOptions = useCallback(async () => {
    setCustomColorOptionsState(await loadCustomColorOptions());
  }, []);

  const setCustomColorOptions = useCallback(async (nextOptions: ColorOption[]) => {
    await saveCustomColorOptions(nextOptions);
    setCustomColorOptionsState(nextOptions);
  }, []);

  useEffect(() => {
    reloadColorOptions();
  }, [reloadColorOptions]);

  return {
    colorOptions,
    customColorOptions,
    reloadColorOptions,
    setCustomColorOptions,
  };
}
