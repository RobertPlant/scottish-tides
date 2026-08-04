// A "now" that ticks, for the current-time markers on the day charts. One
// minute is the resolution anything on screen is drawn at (times are HH:MM, the
// marker moves <1 px per minute), and it also rolls the day over at midnight for
// anything deriving today's date from a render.

import { useEffect, useState } from 'react';

export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
