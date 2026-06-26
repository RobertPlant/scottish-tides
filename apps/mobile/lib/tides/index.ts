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
 * Drop insignificant high/low waters by prominence. Near-amphidromic ports (e.g.
 * Port Ellen, where overtides dominate a tiny M2) genuinely have double-highs and
 * standstills — the harmonic curve really does wiggle — but a 1 cm bump shouldn't
 * be labelled a separate "High water". This collapses any extremum whose rise/
 * fall to a neighbour is below `minProminenceM`; when one is removed its two
 * same-type neighbours merge, keeping the more extreme. Normal ports (metres of
 * range) are unaffected.
 */
export function pruneMinorExtrema(events: TideEvent[], minProminenceM: number): TideEvent[] {
  const evs = [...events];
  while (evs.length > 2) {
    let minIdx = -1;
    let minProm = Infinity;
    for (let i = 1; i < evs.length - 1; i++) {
      const prom = Math.min(
        Math.abs(evs[i].height - evs[i - 1].height),
        Math.abs(evs[i].height - evs[i + 1].height),
      );
      if (prom < minProm) {
        minProm = prom;
        minIdx = i;
      }
    }
    if (minIdx === -1 || minProm >= minProminenceM) {
      break;
    }
    evs.splice(minIdx, 1);
    // The two neighbours are now the same type and adjacent — keep the more
    // extreme (higher high / lower low), drop the other.
    const a = evs[minIdx - 1];
    const b = evs[minIdx];
    if (a && b && a.type === b.type) {
      const keepA = a.type === 'high' ? a.height >= b.height : a.height <= b.height;
      evs.splice(keepA ? minIdx : minIdx - 1, 1);
    }
  }
  return evs;
}

/**
 * High/low waters between two instants for a station, optionally corrected to a
 * secondary port. The window is padded internally so events near the edges are
 * not missed, then trimmed back to [from, to]. Sub-`minProminenceM` wiggles are
 * pruned (see `pruneMinorExtrema`).
 */
export function predictExtrema(
  data: StationData,
  from: Date,
  to: Date,
  shift?: Shift,
  minProminenceM = 0.05,
): TideEvent[] {
  const tide = new Tide(data);
  const raw = tide.extrema(from, to);
  const shifted = shift ? applyShift(raw, shift) : raw;
  return pruneMinorExtrema(shifted, minProminenceM);
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
