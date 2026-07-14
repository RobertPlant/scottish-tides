// Per-day / "right now" derivations on top of the engine, shared by the screens.

import coefficientRefs from '@/assets/data/coefficient-refs.json';
import { addDays } from '@/lib/datetime';
import type { Station } from '@/lib/stations';
import { heightSeries, predictExtrema, type TideEvent } from '@/lib/tides';

const COEF_REFS = coefficientRefs as Record<string, { springRef: number; neapRef: number }>;

function dayWindow(dayStart: Date): { from: Date; to: Date } {
  return { from: dayStart, to: addDays(dayStart, 1) };
}

/** Mean of the high- and low-water offsets — used to approximate a shifted curve. */
function meanShift(station: Station): { dtMin: number; dh: number } {
  if (!station.shift) {
    return { dtMin: 0, dh: 0 };
  }
  return {
    dtMin: (station.shift.hw_time_min + station.shift.lw_time_min) / 2,
    dh: (station.shift.hw_height_m + station.shift.lw_height_m) / 2,
  };
}

/** High/low waters for the UK civil day starting at `dayStart`. */
export function dayEvents(station: Station, dayStart: Date): TideEvent[] {
  const { from, to } = dayWindow(dayStart);
  return predictExtrema(station.data, from, to, station.shift);
}

/**
 * Continuous height samples for charting the day. Secondary-port stations are
 * approximated by a uniform time+height offset (the curve *shape* is the base
 * gauge's); the high/low markers from `dayEvents` remain exact.
 */
export function dayHeightSeries(
  station: Station,
  dayStart: Date,
  stepMinutes = 10,
): { time: Date; height: number }[] {
  const { from, to } = dayWindow(dayStart);
  const base = heightSeries(station.data, from, to, stepMinutes);
  if (!station.shift) {
    return base;
  }
  const { dtMin, dh } = meanShift(station);
  return base.map((s) => ({
    time: new Date(s.time.getTime() + dtMin * 60_000),
    height: s.height + dh,
  }));
}

export interface TidalStats {
  springRange: number; // mean spring range (m)
  neapRange: number; // mean neap range (m)
}

/**
 * Mean spring/neap range for a station. Prefers the empirically-calibrated
 * references in coefficient-refs.json (mean of realised spring-peak / neap-
 * trough daily ranges — see tools/gen-coefficient-refs.ts), which include K2,
 * N2 and the diurnal contribution that the idealised 2·(M2±S2) formula misses.
 * Falls back to that formula for any gauge without a baked reference. For
 * secondary ports the constant HW−LW shift is added, since it widens/narrows
 * every tide equally.
 */
export function tidalStats(station: Station): TidalStats {
  const rangeShift = station.shift ? station.shift.hw_height_m - station.shift.lw_height_m : 0;
  const ref = COEF_REFS[station.data.station];
  let springRange: number;
  let neapRange: number;
  if (ref) {
    springRange = ref.springRef + rangeShift;
    neapRange = ref.neapRef + rangeShift;
  } else {
    const amp = (name: string) =>
      station.data.constituents.find((c) => c.name === name)?.amplitude ?? 0;
    springRange = 2 * (amp('M2') + amp('S2')) + rangeShift;
    neapRange = 2 * Math.abs(amp('M2') - amp('S2')) + rangeShift;
  }
  return {
    springRange: Math.max(springRange, 0.1),
    neapRange: Math.max(neapRange, 0.05),
  };
}

/** Range of a day's events: highest high water minus lowest low water. */
export function dayRange(events: TideEvent[]): number {
  const highs = events.filter((e) => e.type === 'high').map((e) => e.height);
  const lows = events.filter((e) => e.type === 'low').map((e) => e.height);
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
   * extrapolated and clamped to [20, 120]. The constant range-shift for
   * secondary ports cancels in the (range − neap)/(spring − neap) ratio, so
   * this stays a purely astronomical quantity.
   */
  coefficient: number;
}

/** Classify a day's range between the station's neap and spring ranges. */
export function classifyTide(range: number, stats: TidalStats): TideClass {
  const span = stats.springRange - stats.neapRange;
  const raw = span > 0 ? (range - stats.neapRange) / span : 0.5;
  const fraction = Math.min(Math.max(raw, 0), 1);
  const label = fraction >= 0.66 ? 'Springs' : fraction <= 0.34 ? 'Neaps' : 'Mid-range';
  const coefficient = Math.round(Math.min(Math.max(45 + raw * 50, 20), 120));
  return { label, fraction, coefficient };
}

/**
 * Continuous sea level for a station over an arbitrary window (secondary ports
 * get the uniform shift). Used by the Falls-of-Lora sill model.
 */
export function seaLevelSeries(
  station: Station,
  from: Date,
  to: Date,
  stepMinutes = 10,
): { time: Date; height: number }[] {
  const base = heightSeries(station.data, from, to, stepMinutes);
  if (!station.shift) {
    return base;
  }
  const { dtMin, dh } = meanShift(station);
  return base.map((s) => ({
    time: new Date(s.time.getTime() + dtMin * 60_000),
    height: s.height + dh,
  }));
}
