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
  const wall = new Date(
    guessUtcMidnight.toLocaleString('en-US', { timeZone: UK_TZ }),
  );
  const offsetMs = wall.getTime() - guessUtcMidnight.getTime();
  return new Date(guessUtcMidnight.getTime() - offsetMs);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
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
