// Date/time helpers. All tide instants are absolute (UTC under the hood); we
// display them in UK local time so BST/GMT is handled automatically.

export const UK_TZ = 'Europe/London';

/** "14:32" in UK local time. */
export function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: UK_TZ,
  });
}

/** "Fri 3 Jul" in UK local time. */
export function formatDay(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: UK_TZ,
  });
}

/** "Friday 3 July 2026". */
export function formatLongDay(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: UK_TZ,
  });
}

/** UK (Europe/London) UTC offset in ms at `instant` — e.g. +3_600_000 during
 *  BST, 0 during GMT. Purely `Intl`-based, so it never depends on the host
 *  machine's own timezone. */
function ukOffsetMs(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TZ,
    hourCycle: 'h23', // 00–23, avoids the "24:00" midnight quirk
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  // The same wall-clock components read as if they were UTC, minus the real
  // instant, is the zone's offset.
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return asUtc - instant.getTime();
}

/** The absolute instant of UK civil midnight for a y/m/d. UK midnight is always
 *  ≥1 h from a DST change, so the offset at "wall-midnight as UTC" is the
 *  offset that applies at the true midnight. */
function ukMidnight(y: number, m: number, day: number): Date {
  const wallAsUtc = Date.UTC(y, m - 1, day, 0, 0, 0);
  return new Date(wallAsUtc - ukOffsetMs(new Date(wallAsUtc)));
}

/** Local civil midnight (UK) of the day containing `d`, as an absolute instant. */
export function ukStartOfDay(d: Date): Date {
  const [y, m, day] = ymdInUk(d).split('-').map(Number);
  return ukMidnight(y, m, day);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

/** Calendar date (YYYY-MM-DD) of an instant as seen in UK local time. */
export function ymdInUk(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: UK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Add days to a YYYY-MM-DD calendar string (pure UTC math, DST-safe). */
export function ymdAddDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The UK civil-midnight instant for a YYYY-MM-DD calendar date. */
export function ukDayStartFromYmd(ymd: string): Date {
  const [y, m, day] = ymd.split('-').map(Number);
  return ukMidnight(y, m, day);
}

/** "in 2h 14m" / "2h 14m ago" relative to now. */
export function formatRelative(target: Date, now: Date = new Date()): string {
  const ms = target.getTime() - now.getTime();
  const past = ms < 0;
  const mins = Math.round(Math.abs(ms) / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const body = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return past ? `${body} ago` : `in ${body}`;
}
