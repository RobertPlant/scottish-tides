// Per-day / "right now" derivations on top of the engine, shared by the screens.

import { addDays } from '@/lib/datetime';
import type { Station } from '@/lib/stations';
import { heightSeries, predictExtrema, type TideEvent, Tide } from '@/lib/tides';

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
 * Mean spring/neap range from the semidiurnal constituents: spring = 2·(M2+S2),
 * neap = 2·|M2−S2|. For secondary ports the constant height shift (HW − LW
 * offset) is added, since it widens/narrows every tide equally.
 */
export function tidalStats(station: Station): TidalStats {
  const amp = (name: string) =>
    station.data.constituents.find((c) => c.name === name)?.amplitude ?? 0;
  const m2 = amp('M2');
  const s2 = amp('S2');
  const rangeShift = station.shift ? station.shift.hw_height_m - station.shift.lw_height_m : 0;
  return {
    springRange: Math.max(2 * (m2 + s2) + rangeShift, 0.1),
    neapRange: Math.max(2 * Math.abs(m2 - s2) + rangeShift, 0.05),
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

export interface Window {
  start: Date;
  end: Date;
}

function crossingTime(
  a: { time: Date; height: number },
  b: { time: Date; height: number },
  threshold: number,
): Date {
  const f = (threshold - a.height) / (b.height - a.height || 1);
  const clamped = Math.min(Math.max(f, 0), 1);
  return new Date(a.time.getTime() + clamped * (b.time.getTime() - a.time.getTime()));
}

/**
 * Time windows when the water level is above (or below) `threshold`, from a fine
 * height series. Edge crossing times are linearly interpolated. Use for "when
 * can I float off the slip / clear that rock / cross the causeway".
 */
export function thresholdWindows(
  series: { time: Date; height: number }[],
  threshold: number,
  mode: 'above' | 'below',
): Window[] {
  const meets = (h: number) => (mode === 'above' ? h >= threshold : h <= threshold);
  const out: Window[] = [];
  let start: Date | null = null;
  for (let i = 0; i < series.length; i++) {
    const inside = meets(series[i].height);
    if (inside && start === null) {
      start = i > 0 ? crossingTime(series[i - 1], series[i], threshold) : series[i].time;
    } else if (!inside && start !== null) {
      out.push({ start, end: crossingTime(series[i - 1], series[i], threshold) });
      start = null;
    }
  }
  if (start !== null) {
    out.push({ start, end: series[series.length - 1].time });
  }
  return out;
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

export interface NowState {
  heightNow: number;
  rising: boolean;
  prev?: TideEvent;
  next?: TideEvent;
  afterNext?: TideEvent;
}

/** Current level + the surrounding high/low waters. */
export function nowState(station: Station, now: Date = new Date()): NowState {
  const from = new Date(now.getTime() - 15 * 3600_000);
  const to = new Date(now.getTime() + 24 * 3600_000);
  const events = predictExtrema(station.data, from, to, station.shift);

  const tide = new Tide(station.data);
  const { dh } = meanShift(station);
  const heightNow = tide.heightAt(now) + dh;

  const prev = [...events].reverse().find((e) => e.time.getTime() <= now.getTime());
  const nextIdx = events.findIndex((e) => e.time.getTime() > now.getTime());
  const next = nextIdx >= 0 ? events[nextIdx] : undefined;
  const afterNext = nextIdx >= 0 ? events[nextIdx + 1] : undefined;
  const rising = next ? next.type === 'high' : false;

  return { heightNow, rising, prev, next, afterNext };
}
