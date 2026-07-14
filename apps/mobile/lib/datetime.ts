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

/** Local civil midnight (UK) of the day containing `d`, as an absolute instant. */
export function ukStartOfDay(d: Date): Date {
  // Get the y/m/d as seen in UK time, then find the UTC instant of 00:00 UK.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: UK_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const y = get('year');
  const m = get('month');
  const day = get('day');
  // UK offset (minutes) at this date: compare the wall time to UTC.
  const guessUtcMidnight = new Date(`${y}-${m}-${day}T00:00:00Z`);
  const wall = new Date(guessUtcMidnight.toLocaleString('en-US', { timeZone: UK_TZ }));
  const offsetMs = wall.getTime() - guessUtcMidnight.getTime();
  return new Date(guessUtcMidnight.getTime() - offsetMs);
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
  // Noon UTC is always within the same civil day in the UK (UTC or UTC+1),
  // so reducing it to UK start-of-day yields that date's midnight.
  return ukStartOfDay(new Date(`${ymd}T12:00:00Z`));
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
