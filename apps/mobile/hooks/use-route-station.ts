// The station named by the route, kept in step with the persisted selection.
// Both station-carrying tabs (/station/[id] and /plan/[id]) need exactly this —
// resolve the id, mirror it into the context so the other tab follows, and
// switch by replacing the URL — and each had its own copy.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { useSelectedStation } from '@/lib/selected-station';
import { type Station, STATIONS, stationById } from '@/lib/stations';

export function useRouteStation(pathname: '/station/[id]' | '/plan/[id]'): {
  station: Station;
  switchStation: (id: string) => void;
} {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const station = stationById(id) ?? STATIONS[0];
  const { stationId, setStationId } = useSelectedStation();

  // Keep the persisted "current" station in sync with whatever we're viewing
  // (e.g. arriving via a shared link) so the other tab points back here.
  useEffect(() => {
    if (station.id !== stationId) {
      setStationId(station.id);
    }
  }, [station.id, stationId, setStationId]);

  const switchStation = useCallback(
    (sid: string) => {
      setStationId(sid);
      router.replace({ pathname, params: { id: sid } });
    },
    [router, pathname, setStationId],
  );

  return { station, switchStation };
}
