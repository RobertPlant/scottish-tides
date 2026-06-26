// Offline harmonic tide engine — public surface.
//
// A faithful TypeScript port of the pytides2-based predictor in
// ~/org/scripts/tides.py. Given a station's fitted constituents it computes
// water level at any instant and the high/low waters between two instants,
// entirely on-device. See README and AGENTS.md.

export { astro } from './astro';
export { noaa, NAME2CONST, type Constituent } from './constituents';
export {
  Tide,
  applyShift,
  type ConstituentJSON,
  type Shift,
  type StationData,
  type TideEvent,
  type TideEventType,
} from './predict';

import { applyShift, type Shift, type StationData, Tide, type TideEvent } from './predict';

/**
 * High/low waters between two instants for a station, optionally corrected to a
 * secondary port. The window is padded internally so events near the edges are
 * not missed, then trimmed back to [from, to].
 */
export function predictExtrema(
  data: StationData,
  from: Date,
  to: Date,
  shift?: Shift,
): TideEvent[] {
  const tide = new Tide(data);
  const events = tide.extrema(from, to);
  return shift ? applyShift(events, shift) : events;
}

/** Continuous height samples for charting, `stepMinutes` apart over [from, to]. */
export function heightSeries(
  data: StationData,
  from: Date,
  to: Date,
  stepMinutes = 10,
): { time: Date; height: number }[] {
  const tide = new Tide(data);
  const times: Date[] = [];
  const stepMs = stepMinutes * 60_000;
  for (let t = from.getTime(); t <= to.getTime(); t += stepMs) {
    times.push(new Date(t));
  }
  const heights = tide.heightsAt(times);
  return times.map((time, i) => ({ time, height: heights[i] }));
}
