// Selected station + favourites, shared across tabs and persisted (AsyncStorage).
// Last station is restored on launch; favourites are starred ports pinned first.

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { STATIONS } from '@/lib/stations';
import { loadFavourites, loadLastStation, saveFavourites, saveLastStation } from '@/lib/storage';

interface SelectedStationContext {
  stationId: string;
  setStationId: (id: string) => void;
  favourites: string[];
  toggleFavourite: (id: string) => void;
  isFavourite: (id: string) => boolean;
}

const Ctx = createContext<SelectedStationContext | null>(null);

const DEFAULT_ID = STATIONS.find((s) => s.id === 'oban')?.id ?? STATIONS[0]?.id ?? 'oban';

export function SelectedStationProvider({ children }: { children: ReactNode }) {
  const [stationId, setStationIdState] = useState(DEFAULT_ID);
  const [favourites, setFavourites] = useState<string[]>([]);

  // Restore persisted state on launch.
  useEffect(() => {
    loadLastStation().then((id) => {
      if (id && STATIONS.some((s) => s.id === id)) {
        setStationIdState(id);
      }
    });
    loadFavourites().then((ids) => setFavourites(ids.filter((id) => STATIONS.some((s) => s.id === id))));
  }, []);

  const setStationId = useCallback((id: string) => {
    setStationIdState(id);
    void saveLastStation(id);
  }, []);

  const toggleFavourite = useCallback((id: string) => {
    setFavourites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      void saveFavourites(next);
      return next;
    });
  }, []);

  const isFavourite = useCallback((id: string) => favourites.includes(id), [favourites]);

  const value = useMemo(
    () => ({ stationId, setStationId, favourites, toggleFavourite, isFavourite }),
    [stationId, setStationId, favourites, toggleFavourite, isFavourite],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelectedStation(): SelectedStationContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useSelectedStation must be used within SelectedStationProvider');
  }
  return ctx;
}
