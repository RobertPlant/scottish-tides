// Per-day / "right now" derivations on top of the engine, shared by the screens.

import coefficientRefs from '@/assets/data/coefficient-refs.json';
import { ukEndOfDay } from '@/lib/datetime';
import type { Station } from '@/lib/stations';
import { getHeightMap, heightSeries, predictExtrema, shiftHeight, type TideEvent } from '@/lib/tides';

const COEF_REFS = coefficientRefs as Record<string, { springRef: number; neapRef: number }>;

function dayWindow(dayStart: Date): { from: Date; to: Date } {
  return { from: dayStart, to: ukEndOfDay(dayStart) };
}

function getMeanShiftMs(shift: NonNullable<Station['shift']>): number {
  return ((shift.hw_time_min + shift.lw_time_min) / 2) * 60_000;
}

/**
 * Apply a secondary-port correction to a continuous curve. The time uses the
 * mean of the HW/LW offsets (they differ by only a few minutes, and the curve is
 * near-flat at the turns, so the error is sub-pixel). The height goes through
 * the same linear map as the HW/LW markers (see `applyShift`), so peaks and
 * troughs land on their markers.
 */
function shiftCurve(
  base: { time: Date; height: number }[],
  shift: NonNullable<Station['shift']>,
): { time: Date; height: number }[] {
  const dtMs = getMeanShiftMs(shift);
  return base.map(s => ({
    time: new Date(s.time.getTime() + dtMs),
    height: shiftHeight(s.height, shift),
  }));
}

/** High/low waters for the UK civil day starting at `dayStart`. */
export function dayEvents(station: Station, dayStart: Date): TideEvent[] {
  const { from, to } = dayWindow(dayStart);
  return predictExtrema(station.data, from, to, station.shift);
}

/**
 * Continuous height samples for charting the day. Secondary-port stations warp
 * the base gauge's curve *shape* by the secondary-port offset (see `shiftCurve`);
 * the high/low markers from `dayEvents` remain exact and sit on the curve.
 */
export function dayHeightSeries(station: Station, dayStart: Date): { time: Date; height: number }[] {
  const { from, to } = dayWindow(dayStart);
  return seaLevelSeries(station, from, to);
}

export interface TidalStats {
  springRange: number; // mean spring range (m)
  neapRange: number; // mean neap range (m)
}

/**
 * Mean spring/neap range for a station, from coefficient-refs.json (built by tools/gen-coefficient-refs.ts).
 * Secondary ports multiply both by the mean of their high and low water height scales.
 */
export function tidalStats(station: Station): TidalStats {
  const ref = COEF_REFS[station.data.station];
  if (!ref) {
    throw new Error(`no coefficient ref for ${station.data.station}, run tools/gen-coefficient-refs.ts`);
  }

  // ponytail: mean of the HW and LW scales, off by ~0.1 m on a split shift; use absolute spring/neap levels if that shows
  const rangeScale = station.shift
    ? (getHeightMap(station.shift, 'high').scale + getHeightMap(station.shift, 'low').scale) / 2
    : 1;

  return { springRange: ref.springRef * rangeScale, neapRange: ref.neapRef * rangeScale };
}

/** Range of a day's events: highest high water minus lowest low water. */
export function dayRange(events: TideEvent[]): number {
  const highs = events.filter(e => e.type === 'high').map(e => e.height);
  const lows = events.filter(e => e.type === 'low').map(e => e.height);
  if (highs.length === 0 || lows.length === 0) {
    return 0;
  }
  return Math.max(...highs) - Math.min(...lows);
}

export interface TideClass {
  label: 'Springs' | 'Neaps' | 'Mid-range';
  /** 0 = neaps, 1 = springs (clamped). */
  fraction: number;
  /**
   * Tidal coefficient on the French (SHOM) 20–120 scale: a numerical measure
   * of "springiness". Anchored so mean neaps = 45 and mean springs = 95, then
   * extrapolated and clamped to [20, 120]. The range scale for
   * secondary ports cancels in the (range − neap)/(spring − neap) ratio, so
   * this stays a purely astronomical quantity.
   */
  coefficient: number;
}

/**
 * Which palette colour a tide class is drawn in - the key, not the colour, so
 * this stays in the pure layer. Shared by the day badge and the week strip,
 * which had the same three-way ternary each.
 */
export function tideClassKey(label: TideClass['label']): 'accent' | 'muted' | 'tint' {
  if (label === 'Springs') {
    return 'accent';
  }
  if (label === 'Neaps') {
    return 'muted';
  }

  return 'tint';
}

function labelTideFraction(fraction: number): TideClass['label'] {
  if (fraction >= 0.66) {
    return 'Springs';
  }
  if (fraction <= 0.34) {
    return 'Neaps';
  }

  return 'Mid-range';
}

/** Classify a day's range between the station's neap and spring ranges. */
export function classifyTide(range: number, stats: TidalStats): TideClass {
  const span = stats.springRange - stats.neapRange;
  const raw = span > 0 ? (range - stats.neapRange) / span : 0.5;
  const fraction = Math.min(Math.max(raw, 0), 1);
  const label = labelTideFraction(fraction);
  const coefficient = Math.round(Math.min(Math.max(45 + raw * 50, 20), 120));
  return { label, fraction, coefficient };
}

/** Range and spring/neap class of the UK civil day starting at `dayStart`. */
export function classifyDay(
  station: Station,
  dayStart: Date,
  stats: TidalStats = tidalStats(station),
): { range: number; cls: TideClass } {
  const range = dayRange(dayEvents(station, dayStart));

  return { range, cls: classifyTide(range, stats) };
}

/**
 * Continuous sea level for a station over an arbitrary window (secondary ports
 * get the warped shift, see `shiftCurve`).
 */
export function seaLevelSeries(station: Station, from: Date, to: Date): { time: Date; height: number }[] {
  const { shift } = station;
  if (!shift) {
    return heightSeries(station.data, from, to);
  }

  // sample the base port earlier by the offset, so the shifted curve covers [from, to]
  const dtMs = getMeanShiftMs(shift);
  const base = heightSeries(station.data, new Date(from.getTime() - dtMs), new Date(to.getTime() - dtMs));

  return shiftCurve(base, shift);
}
