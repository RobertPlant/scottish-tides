// Regenerate apps/mobile/assets/data/scotland-coast.json — the schematic map's
// coastline. Source: Natural Earth 1:10m country boundaries (via world-atlas),
// GB (ISO 826) clipped to the Scotland bounding box and decimated.
//
// These two packages are build-time only (not app deps); install them ad-hoc:
//   npm i --no-save world-atlas@2 topojson-client@3
//   node tools/gen-coastline.mjs
//
// Keep BBOX in sync with components/scotland-map.tsx.

import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const topo = require('world-atlas/countries-10m.json');
const { feature } = require('topojson-client');

const BBOX = [-8.2, 54.4, -0.5, 61.0]; // lon0, lat0, lon1, lat1
const MIN_SPACING_DEG = 0.008; // decimation (~0.8 km)

const fc = feature(topo, topo.objects.countries);
const gb = fc.features.find((f) => f.id === '826');
if (!gb) {
  throw new Error('GB (ISO 826) not found in world-atlas data');
}
const polys = gb.geometry.coordinates; // MultiPolygon

const inside = (p, e) =>
  e === 0 ? p[0] >= BBOX[0] : e === 1 ? p[0] <= BBOX[2] : e === 2 ? p[1] >= BBOX[1] : p[1] <= BBOX[3];
function isect(a, b, e) {
  const t =
    e === 0
      ? (BBOX[0] - a[0]) / (b[0] - a[0])
      : e === 1
        ? (BBOX[2] - a[0]) / (b[0] - a[0])
        : e === 2
          ? (BBOX[1] - a[1]) / (b[1] - a[1])
          : (BBOX[3] - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}
// Sutherland–Hodgman clip of a ring to the bounding box.
function clip(ring) {
  let out = ring;
  for (let e = 0; e < 4; e++) {
    const inp = out;
    out = [];
    for (let i = 0; i < inp.length; i++) {
      const cur = inp[i];
      const prev = inp[(i + inp.length - 1) % inp.length];
      const ci = inside(cur, e);
      const pi = inside(prev, e);
      if (ci) {
        if (!pi) out.push(isect(prev, cur, e));
        out.push(cur);
      } else if (pi) {
        out.push(isect(prev, cur, e));
      }
    }
    if (!out.length) break;
  }
  return out;
}
function decimate(ring, minD) {
  if (ring.length < 3) return ring;
  const out = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    const l = out[out.length - 1];
    if (Math.hypot(ring[i][0] - l[0], ring[i][1] - l[1]) >= minD) out.push(ring[i]);
  }
  return out;
}
const round = (v) => Math.round(v * 1000) / 1000;

const rings = [];
for (const poly of polys) {
  const clipped = clip(poly[0]);
  if (clipped.length >= 4) {
    const d = decimate(clipped, MIN_SPACING_DEG).map((p) => [round(p[0]), round(p[1])]);
    if (d.length >= 4) rings.push(d);
  }
}
rings.sort((a, b) => b.length - a.length);

const out = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'apps',
  'mobile',
  'assets',
  'data',
  'scotland-coast.json',
);
writeFileSync(out, JSON.stringify(rings));
console.log(`wrote ${rings.length} rings, ${rings.reduce((a, r) => a + r.length, 0)} points`);
