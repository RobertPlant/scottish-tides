// Day selection + navigation shared by the station and tidal-stream day views:
// the current YYYY-MM-DD, its UK day-start instant, today/min/max bounds, and a
// setter that optionally keeps ?d= in the URL for shareable links.

import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useNow } from '@/hooks/use-now';
import { parseYmd, ukDayStartFromYmd, ymdAddDays, ymdInUk } from '@/lib/datetime';

// Module-level so `setDay` can use it without taking a per-render closure as a
// hook dependency - the initial-day clamp and the setter had a copy each.
// ISO YYYY-MM-DD compares correctly as a string.
function clamp(ymd: string, min: string, max: string): string {
  if (ymd < min) {
    return min;
  }
  if (ymd > max) {
    return max;
  }

  return ymd;
}

// the ?d= day if it's a real date, kept inside the bounds, else today
function getUrlDay(
  urlYmd: string | undefined,
  todayYmd: string,
  minYmd: string,
  maxYmd: string,
): string {
  const parsed = parseYmd(urlYmd);

  return parsed ? clamp(parsed, minYmd, maxYmd) : todayYmd;
}

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
  // Derived from the ticking clock, not read once on mount: an app left open
  // overnight otherwise keeps calling yesterday "today". Taking it off `useNow`
  // rather than a bare `new Date()` also keeps it honest under the React
  // Compiler, which is free to cache a render-time value with no dependencies.
  const todayYmd = ymdInUk(useNow());
  const minYmd = ymdAddDays(todayYmd, -730);
  const maxYmd = ymdAddDays(todayYmd, 730);
  // Clamped here rather than in the UI so every route in - Prev/Next, the swipe
  // gesture, the week strip, a hand-edited ?d= - obeys the same bounds. The date
  // field already refuses out-of-range input; the others used to walk past it.
  const [ymd, setYmd] = useState(() => getUrlDay(initialYmd, todayYmd, minYmd, maxYmd));
  // a mounted screen gets a new ?d= when the planner pushes to it, so follow it.
  // A ?d= that disappears (the Tides tab links without one) keeps the day, and
  // while our own setParams is in flight an older ?d= is our echo, not a jump.
  const [seenUrlYmd, setSeenUrlYmd] = useState(initialYmd);
  const [pendingUrlYmd, setPendingUrlYmd] = useState<string>();
  if (initialYmd !== seenUrlYmd) {
    setSeenUrlYmd(initialYmd);
    if (initialYmd === pendingUrlYmd) {
      setPendingUrlYmd(undefined);
    } else if (pendingUrlYmd === undefined && initialYmd !== undefined) {
      setYmd(getUrlDay(initialYmd, todayYmd, minYmd, maxYmd));
    }
  }

  const dayStart = useMemo(() => ukDayStartFromYmd(ymd), [ymd]);

  const setDay = useCallback(
    (next: string) => {
      const clamped = clamp(next, minYmd, maxYmd);
      setYmd(clamped);
      if (syncUrl && clamped !== initialYmd) {
        setPendingUrlYmd(clamped);
        router.setParams({ d: clamped });
      }
    },
    [router, syncUrl, minYmd, maxYmd, initialYmd],
  );

  return { ymd, dayStart, todayYmd, isToday: ymd === todayYmd, minYmd, maxYmd, setDay };
}
