import { useCallback, useEffect, useState } from 'react';

import { loadFitSizeOptions, saveFitSizeOptions } from '../storage/fitSizeOptions';
import { DEFAULT_FIT_SIZE_OPTIONS } from '../types/clothing';

export function useFitSizeOptions() {
  const [fitSizeOptions, setFitSizeOptionsState] = useState<string[]>([
    ...DEFAULT_FIT_SIZE_OPTIONS,
  ]);

  const reloadFitSizeOptions = useCallback(async () => {
    setFitSizeOptionsState(await loadFitSizeOptions());
  }, []);

  const setFitSizeOptions = useCallback(async (nextOptions: string[]) => {
    await saveFitSizeOptions(nextOptions);
    setFitSizeOptionsState(nextOptions);
  }, []);

  useEffect(() => {
    void reloadFitSizeOptions();
  }, [reloadFitSizeOptions]);

  return { fitSizeOptions, reloadFitSizeOptions, setFitSizeOptions };
}
