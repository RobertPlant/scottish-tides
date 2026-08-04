// Selected station + favourites, shared across tabs and persisted (AsyncStorage).
// Last station is restored on launch; favourites are starred ports pinned first.

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { STATIONS } from '@/lib/stations';
import { loadFavourites, loadLastStation, saveFavourites, saveLastStation } from '@/lib/storage';

interface SelectedStationContext {
  stationId: string;
  /** False until the persisted state has been read back (AsyncStorage is async). */
  ready: boolean;
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
  const [ready, setReady] = useState(false);

  // Restore persisted state on launch. Nothing may route off `stationId` until
  // this lands (see `ready`): the index route used to redirect to the default
  // port first, and the station screen then wrote that default straight back
  // over the restored last station.
  useEffect(() => {
    Promise.all([loadLastStation(), loadFavourites()]).then(([id, ids]) => {
      if (id && STATIONS.some((s) => s.id === id)) {
        setStationIdState(id);
      }
      setFavourites(ids.filter((fid) => STATIONS.some((s) => s.id === fid)));
      setReady(true);
    });
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
    () => ({ stationId, ready, setStationId, favourites, toggleFavourite, isFavourite }),
    [stationId, ready, setStationId, favourites, toggleFavourite, isFavourite],
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
