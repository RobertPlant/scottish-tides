// Month / year trip-planner derivations: a calendar of days, each classified on
// the station's neap↔spring scale, plus the sequential colour ramp the grid and
// year heatmap are painted with. Pure (no React/RN) so it stays unit-testable —
// the screens layer the UI on top. Builds on the same per-day engine helpers as
// the 7-day overview (dayEvents/dayRange/classifyTide).

import { ukDayStartFromYmd } from '@/lib/datetime';
import type { Station } from '@/lib/stations';
import {
  classifyTide,
  dayEvents,
  dayRange,
  type TidalStats,
  type TideClass,
  tidalStats,
} from '@/lib/tide-day';

export interface DayCell {
  ymd: string; // YYYY-MM-DD
  day: number; // day-of-month 1..31
  month: number; // 1..12
  year: number;
  /** 0 = Monday … 6 = Sunday (UK week starts Monday). */
  weekday: number;
  isWeekend: boolean;
  /** Day's tidal range (highest HW − lowest LW), metres. */
  range: number;
  cls: TideClass;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 0 = Monday … 6 = Sunday, from a civil YYYY-MM-DD (pure UTC math, DST-safe). */
function weekdayMonFirst(ymd: string): number {
  const dow = new Date(`${ymd}T00:00:00Z`).getUTCDay(); // 0 = Sunday … 6 = Saturday
  return (dow + 6) % 7;
}

/** Days in a 1-indexed month (day 0 of the next month = last day of this one). */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Classify a single civil day for a station. */
export function dayCell(station: Station, ymd: string, stats: TidalStats): DayCell {
  const range = dayRange(dayEvents(station, ukDayStartFromYmd(ymd)));
  const cls = classifyTide(range, stats);
  const [year, month, day] = ymd.split('-').map(Number);
  const weekday = weekdayMonFirst(ymd);
  return { ymd, day, month, year, weekday, isWeekend: weekday >= 5, range, cls };
}

/** Every day of a calendar month, in order. */
export function monthDays(
  station: Station,
  year: number,
  month: number,
  stats: TidalStats = tidalStats(station),
): DayCell[] {
  const n = daysInMonth(year, month);
  return Array.from({ length: n }, (_, i) =>
    dayCell(station, `${year}-${pad2(month)}-${pad2(i + 1)}`, stats),
  );
}

/** All twelve months of a year, each with its ordered days. */
export function yearMonths(
  station: Station,
  year: number,
  stats: TidalStats = tidalStats(station),
): { month: number; days: DayCell[] }[] {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    days: monthDays(station, year, i + 1, stats),
  }));
}

// ── Colour ────────────────────────────────────────────────────────────────
// A sequential single-hue (teal) ramp: neaps → springs = low → high intensity.
// Per-theme endpoints so the ramp reads as intensity on both surfaces (light:
// pale→deep; dark: dim→bright). Kept here (pure) rather than in the theme file
// because the interpolation + ink choice is the planner's own concern.

export type Scheme = 'light' | 'dark';

type Rgb = readonly [number, number, number];

const RAMP: Record<Scheme, { lo: Rgb; hi: Rgb }> = {
  light: { lo: [0xdc, 0xeb, 0xea], hi: [0x0e, 0x6e, 0x6a] },
  dark: { lo: [0x12, 0x37, 0x34], hi: [0x63, 0xd6, 0xd0] },
};

const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

/**
 * Fill + readable ink for a day at spring-fraction `t` (0 = neaps, 1 = springs).
 * `bg` is the sequential ramp colour; `ink` flips between dark/light text by the
 * fill's relative luminance so a day number stays legible on any cell.
 */
export function coeffFill(t: number, scheme: Scheme): { bg: string; ink: string } {
  const { lo, hi } = RAMP[scheme];
  const f = clamp01(t);
  const c = lo.map((l, i) => Math.round(l + (hi[i] - l) * f)) as unknown as [
    number,
    number,
    number,
  ];
  const lum = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  return { bg: `rgb(${c[0]}, ${c[1]}, ${c[2]})`, ink: lum > 0.6 ? '#0c1722' : '#ffffff' };
}
