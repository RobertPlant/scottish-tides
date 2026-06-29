// Regenerate apps/mobile/assets/data/coefficient-refs.json — the per-gauge
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

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Tide } from '../apps/mobile/lib/tides';
import type { StationData } from '../apps/mobile/lib/tides';

const DATA_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'apps',
  'mobile',
  'assets',
  'data',
);
const SIM_DAYS = 731; // ~2 years: covers the synodic, anomalistic and annual beats
const WINDOW = 3; // half-window (days) for local spring-peak / neap-trough detection

function dayRange(tide: Tide, dayStart: Date): number {
  const evs = tide.extrema(dayStart, new Date(dayStart.getTime() + 24 * 3600e3));
  const highs = evs.filter((e) => e.type === 'high').map((e) => e.height);
  const lows = evs.filter((e) => e.type === 'low').map((e) => e.height);
  if (highs.length === 0 || lows.length === 0) {
    return 0;
  }
  return Math.max(...highs) - Math.min(...lows);
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function refs(data: StationData): { springRef: number; neapRef: number } {
  const tide = new Tide(data);
  const start = Date.UTC(2025, 0, 1);
  const r: number[] = [];
  for (let d = 0; d < SIM_DAYS; d++) {
    r.push(dayRange(tide, new Date(start + d * 24 * 3600e3)));
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

const out: Record<string, { springRef: number; neapRef: number }> = {};
for (const f of readdirSync(DATA_DIR)) {
  if (!f.endsWith('.json') || f === 'coefficient-refs.json') {
    continue;
  }
  let data: StationData;
  try {
    data = JSON.parse(readFileSync(path.join(DATA_DIR, f), 'utf8'));
  } catch {
    continue;
  }
  if (!Array.isArray(data.constituents) || !data.station) {
    continue;
  }
  out[data.station] = refs(data);
  console.log(
    `${data.station.padEnd(16)} spring=${out[data.station].springRef} neap=${out[data.station].neapRef}`,
  );
}

writeFileSync(path.join(DATA_DIR, 'coefficient-refs.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote coefficient-refs.json (${Object.keys(out).length} gauges)`);
