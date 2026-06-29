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
const EPS_DEG = 0.006; // Douglas–Peucker tolerance (~0.6 km)

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
// Douglas–Peucker on a polyline. Unlike radial-distance decimation it keeps the
// points that matter for the shape, so it doesn't fold tight concavities (sea
// lochs, sounds) into self-crossing bow-ties that then render as unfilled holes.
function rdp(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const [ax, ay] = pts[0];
  const [bx, by] = pts[pts.length - 1];
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let maxD = -1;
  let idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    // Perpendicular distance from pts[i] to segment a→b.
    const t = ((px - ax) * dx + (py - ay) * dy) / len2;
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const d = Math.hypot(px - cx, py - cy);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= eps) return [pts[0], pts[pts.length - 1]];
  const left = rdp(pts.slice(0, idx + 1), eps);
  const right = rdp(pts.slice(idx), eps);
  return left.slice(0, -1).concat(right);
}

// Simplify a closed ring. Treat it as a polyline that returns to its start, then
// back off the tolerance if the result self-intersects (cheap O(n²) check on the
// already-small rings) so no island can render with a hole.
function selfIntersects(ring) {
  const n = ring.length;
  const ccw = (a, b, c) => (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
  const hit = (p1, p2, p3, p4) =>
    ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // adjacent across the closure
      if (hit(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return true;
    }
  }
  return false;
}
function simplifyRing(ring) {
  const closed = ring.concat([ring[0]]);
  for (let eps = EPS_DEG; eps >= 0; eps /= 2) {
    const s = rdp(closed, eps).slice(0, -1); // drop the duplicated closing point
    if (eps === 0 || !selfIntersects(s)) return s;
    if (eps < 1e-5) return s;
  }
  return ring;
}
const round = (v) => Math.round(v * 1000) / 1000;

const rings = [];
for (const poly of polys) {
  const clipped = clip(poly[0]);
  if (clipped.length >= 4) {
    const d = simplifyRing(clipped).map((p) => [round(p[0]), round(p[1])]);
    if (d.length >= 4) rings.push(d);
  }
}
rings.sort((a, b) => b.length - a.length);

const bad = rings.filter(selfIntersects).length;
if (bad > 0) {
  console.warn(`WARNING: ${bad} ring(s) still self-intersect after simplification`);
}

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
