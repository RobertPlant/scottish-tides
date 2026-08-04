// Offline harmonic tide engine — public surface.
//
// A faithful TypeScript port of the pytides2-based predictor in
// ~/org/scripts/tides.py. Given a station's fitted constituents it computes
// water level at any instant and the high/low waters between two instants,
// entirely on-device. See README and AGENTS.md.

import { applyShift, type Shift, type StationData, Tide, type TideEvent } from './predict';

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

/**
 * Drop insignificant high/low waters by prominence. Near-amphidromic ports (e.g.
 * Port Ellen, where overtides dominate a tiny M2) genuinely have double-highs and
 * standstills — the harmonic curve really does wiggle — but a 1 cm bump shouldn't
 * be labelled a separate "High water". This collapses any extremum whose rise/
 * fall to a neighbour is below `minProminenceM`; when one is removed its two
 * same-type neighbours merge, keeping the more extreme. Normal ports (metres of
 * range) are unaffected.
 *
 * Never returns a day with only one kind of water. Each pass drops *two* events
 * (the extremum, then the loser of the neighbour merge), so the `> 2` bound let
 * a three-event day collapse to a lone high water — and a day with no low water
 * reads as 0.0 m range / minimum coefficient however far the water actually
 * moved. When that happens the day falls back to its highest high and lowest
 * low, which is what the range meant all along.
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

  if (!evs.some((e) => e.type === 'high') || !evs.some((e) => e.type === 'low')) {
    const highs = events.filter((e) => e.type === 'high');
    const lows = events.filter((e) => e.type === 'low');
    // Only when the day really has both — a window can legitimately hold a
    // single turn of the tide, and there is nothing to fall back to then.
    if (highs.length > 0 && lows.length > 0) {
      const hi = highs.reduce((a, b) => (b.height > a.height ? b : a));
      const lo = lows.reduce((a, b) => (b.height < a.height ? b : a));
      return [hi, lo].sort((a, b) => a.time.getTime() - b.time.getTime());
    }
  }
  return evs;
}

/**
 * High/low waters between two instants for a station, optionally corrected to a
 * secondary port. The window is padded internally so events near the edges are
 * not missed, then trimmed back to [from, to]. Sub-`minProminenceM` wiggles are
 * pruned (see `pruneMinorExtrema`).
 *
 * The base search window is widened by the secondary-port time offset and the
 * trim happens *after* the shift, so the window means what the caller asked for:
 * an Oban (−21 min) day otherwise both lost its own late-evening event and
 * inherited one from the previous evening.
 */
export function predictExtrema(
  data: StationData,
  from: Date,
  to: Date,
  shift?: Shift,
  minProminenceM = 0.05,
): TideEvent[] {
  const tide = new Tide(data);
  const padMs = shift
    ? Math.max(Math.abs(shift.hw_time_min), Math.abs(shift.lw_time_min)) * 60_000
    : 0;
  const raw = tide.extrema(new Date(from.getTime() - padMs), new Date(to.getTime() + padMs));
  const shifted = shift ? applyShift(raw, shift) : raw;
  return pruneMinorExtrema(shifted, minProminenceM).filter((e) => e.time >= from && e.time <= to);
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
