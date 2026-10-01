import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

export function useGridColumns(storageKey: string, initialColumns: 1 | 2 | 3 = 3) {
  const [gridColumns, setGridColumns] = useState<number>(initialColumns);
  const [ready, setReady] = useState(false);
  const changedByUser = useRef(false);

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(storageKey)
      .then((value) => {
        const columns = Number(value);
        if (mounted && !changedByUser.current && [1, 2, 3, 4].includes(columns)) {
          // Migrate the former four-column MyFit preference to three columns.
          setGridColumns(Math.min(columns, 3));
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, [storageKey]);

  useEffect(() => {
    if (ready) {
      void AsyncStorage.setItem(storageKey, String(gridColumns)).catch(() => {});
    }
  }, [gridColumns, ready, storageKey]);

  const cycleGridColumns = useCallback(() => {
    changedByUser.current = true;
    setGridColumns((columns) => columns === 1 ? 3 : columns - 1);
  }, []);

  return { gridColumns, cycleGridColumns };
}
