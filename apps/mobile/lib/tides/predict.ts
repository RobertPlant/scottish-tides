// Tide model: build from fitted constituents, evaluate heights, find high/low
// water. Mirrors pytides2 tide.py `at()` and `extrema()` closely enough to match
// scripts/tides.py to < 2 min / < 0.03 m (see predict.test.ts).

import { astro, d2r, mod360 } from './astro';
import { type Constituent, NAME2CONST } from './constituents';

export type TideEventType = 'high' | 'low';

export interface TideEvent {
  time: Date;
  height: number;
  type: TideEventType;
}

export interface ConstituentJSON {
  name: string;
  amplitude: number;
  phase: number;
}

export interface StationData {
  station: string;
  units?: string;
  datum?: string;
  timezone_obs?: string;
  default_shift?: string;
  obs_span?: string[];
  constituents: ConstituentJSON[];
}

/** Secondary-port correction (e.g. Oban derived from a Tobermory fit). */
export interface Shift {
  name: string;
  based_on?: string;
  hw_time_min: number;
  lw_time_min: number;
  hw_height_m: number;
  lw_height_m: number;
}

const HOUR_MS = 3600_000;
const PARTITION_H = 240.0;

interface Prepared {
  constituent: Constituent;
  H: number;
  phaseRad: number;
  speed: number; // rad/hour, at t0
  V0: number; // rad, at t0
}

function hoursBetween(t0: Date, t: Date): number {
  return (t.getTime() - t0.getTime()) / HOUR_MS;
}

export class Tide {
  readonly station: string;
  readonly datum?: string;
  readonly units?: string;
  private model: ConstituentJSON[];

  constructor(data: StationData) {
    this.station = data.station;
    this.datum = data.datum;
    this.units = data.units;
    // Normalise: amplitudes positive, phase in [0, 360).
    this.model = data.constituents.map(({ name, amplitude, phase }) => {
      let amp = amplitude;
      let ph = phase;
      if (amp < 0) {
        amp = -amp;
        ph = ph + 180.0;
      }
      return { name, amplitude: amp, phase: mod360(ph) };
    });
  }

  /** Per-constituent speed and equilibrium argument at t0 (radians). */
  private prepare(t0: Date): Prepared[] {
    const a0 = astro(t0);
    return this.model.map(({ name, amplitude, phase }) => {
      const c = NAME2CONST[name];
      if (!c) {
        throw new Error(`Unknown constituent: ${name}`);
      }
      return {
        constituent: c,
        H: amplitude,
        phaseRad: d2r * phase,
        speed: d2r * c.speed(a0),
        V0: d2r * c.V(a0),
      };
    });
  }

  /** Node factors u (rad) and f for each constituent at a given instant. */
  private nodeFactors(prep: Prepared[], t: Date): { u: number; f: number }[] {
    const a = astro(t);
    return prep.map((p) => ({
      u: d2r * mod360(p.constituent.u(a)),
      f: p.constituent.f(a),
    }));
  }

  /**
   * Modelled height at each instant. Mirrors pytides `at()`: speed and V0 are
   * evaluated once at t0 = times[0]; node factors are held constant across each
   * 240-hour partition, evaluated at the partition midpoint.
   */
  heightsAt(times: Date[]): number[] {
    if (times.length === 0) {
      return [];
    }
    const t0 = times[0];
    const prep = this.prepare(t0);

    // Group sample indices by 240h partition from t0.
    const blocks = new Map<number, number[]>();
    const hours = times.map((t) => hoursBetween(t0, t));
    hours.forEach((h, idx) => {
      const block = Math.floor(h / PARTITION_H);
      const list = blocks.get(block);
      if (list) {
        list.push(idx);
      } else {
        blocks.set(block, [idx]);
      }
    });

    const out = new Array<number>(times.length).fill(0);
    for (const [block, indices] of blocks) {
      const midpoint = new Date(t0.getTime() + (block + 0.5) * PARTITION_H * HOUR_MS);
      const nf = this.nodeFactors(prep, midpoint);
      for (const idx of indices) {
        const h = hours[idx];
        let sum = 0;
        for (let k = 0; k < prep.length; k++) {
          const p = prep[k];
          const { u, f } = nf[k];
          sum += p.H * f * Math.cos(p.speed * h + (p.V0 + u) - p.phaseRad);
        }
        out[idx] = sum;
      }
    }
    return out;
  }

  /** Convenience: height at a single instant. */
  heightAt(t: Date): number {
    return this.heightsAt([t])[0];
  }

  /**
   * High and low waters in [t0, t1]. Found as roots of the analytic derivative
   * of the height curve (node factors held at the window midpoint). Each event
   * height is taken from `heightsAt` so it matches the height curve exactly.
   */
  extrema(t0: Date, t1: Date, padHours = 2): TideEvent[] {
    const prep = this.prepare(t0);
    const midpoint = new Date((t0.getTime() + t1.getTime()) / 2);
    const nf = this.nodeFactors(prep, midpoint);

    // Derivative of height wrt hours-from-t0 (per hour).
    const slope = (h: number): number => {
      let s = 0;
      for (let k = 0; k < prep.length; k++) {
        const p = prep[k];
        s += -p.speed * p.H * nf[k].f * Math.sin(p.speed * h + (p.V0 + nf[k].u) - p.phaseRad);
      }
      return s;
    };

    const startH = -padHours;
    const endH = hoursBetween(t0, t1) + padHours;
    const stepH = 1 / 6; // 10-minute scan for sign changes
    const events: TideEvent[] = [];

    let prevH = startH;
    let prevS = slope(prevH);
    for (let h = startH + stepH; h <= endH; h += stepH) {
      const s = slope(h);
      if (prevS === 0) {
        prevS = s === 0 ? 1e-12 : s;
      }
      if (prevS * s < 0) {
        // Bisect for the zero of slope.
        let lo = prevH;
        let hi = h;
        let sLo = prevS;
        for (let i = 0; i < 60; i++) {
          const mid = (lo + hi) / 2;
          const sMid = slope(mid);
          if (sMid === 0) {
            lo = hi = mid;
            break;
          }
          if (sLo * sMid < 0) {
            hi = mid;
          } else {
            lo = mid;
            sLo = sMid;
          }
          if (hi - lo < 1e-7) {
            break;
          }
        }
        const root = (lo + hi) / 2;
        const time = new Date(t0.getTime() + root * HOUR_MS);
        // High when slope passes + -> - ; low when - -> + .
        const type: TideEventType = prevS > 0 ? 'high' : 'low';
        if (time >= t0 && time <= t1) {
          events.push({ time, height: this.heightAt(time), type });
        }
      }
      prevH = h;
      prevS = s;
    }
    return events;
  }
}

/** Apply a secondary-port shift (time + height offset) to each event. */
export function applyShift(events: TideEvent[], shift: Shift): TideEvent[] {
  return events.map((e) => {
    const dtMin = e.type === 'high' ? shift.hw_time_min : shift.lw_time_min;
    const dh = e.type === 'high' ? shift.hw_height_m : shift.lw_height_m;
    return {
      time: new Date(e.time.getTime() + dtMin * 60_000),
      height: e.height + dh,
      type: e.type,
    };
  });
}
