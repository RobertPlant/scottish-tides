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
