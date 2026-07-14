// Day selection + navigation shared by the station and tidal-stream day views:
// the current YYYY-MM-DD, its UK day-start instant, today/min/max bounds, and a
// setter that optionally keeps ?d= in the URL for shareable links.

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { ukDayStartFromYmd, ymdAddDays, ymdInUk } from '@/lib/datetime';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface DayNavState {
  ymd: string;
  dayStart: Date;
  todayYmd: string;
  isToday: boolean;
  minYmd: string;
  maxYmd: string;
  setDay: (ymd: string) => void;
}

export function useDayNav({
  initialYmd,
  syncUrl = false,
}: {
  /** Optional starting day from a shareable ?d=YYYY-MM-DD link. */
  initialYmd?: string;
  /** Keep ?d= in the URL in sync as the day changes. */
  syncUrl?: boolean;
}): DayNavState {
  const router = useRouter();
  const todayYmd = useMemo(() => ymdInUk(new Date()), []);
  const [ymd, setYmd] = useState(() =>
    initialYmd && YMD_RE.test(initialYmd) ? initialYmd : todayYmd,
  );

  const dayStart = useMemo(() => ukDayStartFromYmd(ymd), [ymd]);
  const minYmd = useMemo(() => ymdAddDays(todayYmd, -730), [todayYmd]);
  const maxYmd = useMemo(() => ymdAddDays(todayYmd, 730), [todayYmd]);

  const setDay = useCallback(
    (next: string) => {
      setYmd(next);
      if (syncUrl) {
        router.setParams({ d: next });
      }
    },
    [router, syncUrl],
  );

  return { ymd, dayStart, todayYmd, isToday: ymd === todayYmd, minYmd, maxYmd, setDay };
}
