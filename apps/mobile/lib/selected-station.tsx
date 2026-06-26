// Which station the Home screen is showing. Kept in a small context so the tabs
// share it. No persistence dependency yet — defaults to Oban each launch.

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';
import { STATIONS } from '@/lib/stations';

interface SelectedStationContext {
  stationId: string;
  setStationId: (id: string) => void;
}

const Ctx = createContext<SelectedStationContext | null>(null);

export function SelectedStationProvider({ children }: { children: ReactNode }) {
  const [stationId, setStationId] = useState(STATIONS[0]?.id ?? 'oban');
  const value = useMemo(() => ({ stationId, setStationId }), [stationId]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSelectedStation(): SelectedStationContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useSelectedStation must be used within SelectedStationProvider');
  }
  return ctx;
}
