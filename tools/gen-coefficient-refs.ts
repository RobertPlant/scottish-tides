// Regenerate apps/mobile/assets/data/coefficient-refs.json - the per-gauge
// reference ranges that calibrate the tidal coefficient (French SHOM 20–120
// scale) so that "mean springs" reads ~95 and "mean neaps" ~45.
//
// Why empirical: the idealised 2·(M2±S2) spring/neap ranges ignore K2 (locked to
// S2, so it always adds at springs), N2's perigee modulation, and the diurnal
// contribution to the daily max−min. Anchoring on them makes ordinary springs
// read ~105 and the whole series sit several points high. Instead we simulate a
// couple of years of real daily ranges per gauge and take the mean of the
// spring-peak ranges (→ 95) and neap-trough ranges (→ 45).
//
// Run from apps/mobile (where tsx is installed):
//   cd apps/mobile && node --import tsx ../../tools/gen-coefficient-refs.ts
//
// Re-run when a station's constituents change or a new gauge is added.

import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { STATIONS } from '../apps/mobile/lib/stations';
import { dayRange } from '../apps/mobile/lib/tide-day';
import { type StationData, Tide } from '../apps/mobile/lib/tides';
import { mean } from './tidetimes';

const DATA_DIR = path.join(import.meta.dirname, '..', 'apps', 'mobile', 'assets', 'data');
const SIM_DAYS = 731; // ~2 years: covers the synodic, anomalistic and annual beats
const WINDOW = 3; // half-window (days) for local spring-peak / neap-trough detection

// raw extrema over a UTC day, unpruned, so the references match what they were fitted on
function rawDayRange(tide: Tide, dayStart: Date): number {
  return dayRange(tide.extrema(dayStart, new Date(dayStart.getTime() + 24 * 3600e3)));
}

function refs(data: StationData): { springRef: number; neapRef: number } {
  const tide = new Tide(data);
  const start = Date.UTC(2025, 0, 1);
  const r: number[] = [];
  for (let d = 0; d < SIM_DAYS; d++) {
    r.push(rawDayRange(tide, new Date(start + d * 24 * 3600e3)));
  }

  const peaks: number[] = [];
  const troughs: number[] = [];
  for (let i = WINDOW; i < r.length - WINDOW; i++) {
    const seg = r.slice(i - WINDOW, i + WINDOW + 1);
    if (r[i] === Math.max(...seg) && r[i] > r[i - 1]) {
      peaks.push(r[i]);
    }
    if (r[i] === Math.min(...seg) && r[i] < r[i - 1]) {
      troughs.push(r[i]);
    }
  }
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return { springRef: round(mean(peaks)), neapRef: round(mean(troughs)) };
}

// one entry per gauge, so Oban shares Tobermory's
const gauges = new Map(STATIONS.map(station => [station.data.station, station.data]));
const sorted = [...gauges].toSorted(([a], [b]) => (a < b ? -1 : 1));
const out = Object.fromEntries(sorted.map(([name, data]) => [name, refs(data)]));
for (const [name, ref] of Object.entries(out)) {
  console.log(`${name.padEnd(16)} spring=${ref.springRef} neap=${ref.neapRef}`);
}

writeFileSync(path.join(DATA_DIR, 'coefficient-refs.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote coefficient-refs.json (${Object.keys(out).length} gauges)`);
