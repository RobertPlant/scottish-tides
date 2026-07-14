// Prominence pruning: near-amphidromic ports (Port Ellen) have real but trivial
// double-highs/standstills in the harmonic curve; the app must not label every
// 1 cm wiggle as a separate high/low water. Normal ports must be untouched.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { predictExtrema, type StationData, Tide } from './index';

const dataDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'assets',
  'data',
);
const load = (f: string): StationData => JSON.parse(readFileSync(path.join(dataDir, f), 'utf8'));

const FROM = new Date('2026-06-26T00:00:00Z');
const TO = new Date('2026-06-27T00:00:00Z');
const PROM = 0.05;

test('Port Ellen: sub-5cm wiggles are pruned, leaving a sensible day', () => {
  const raw = new Tide(load('port_ellen.json')).extrema(FROM, TO);
  const pruned = predictExtrema(load('port_ellen.json'), FROM, TO, undefined, PROM);

  assert.ok(
    pruned.length < raw.length,
    `expected pruning to remove events (${raw.length} -> ${pruned.length})`,
  );
  assert.ok(pruned.length <= 5, `still too many events: ${pruned.length}`);

  // Events must alternate high/low and every interior extremum clears the
  // prominence threshold.
  for (let i = 1; i < pruned.length; i++) {
    assert.notEqual(pruned[i].type, pruned[i - 1].type, 'events must alternate H/L');
  }
  for (let i = 1; i < pruned.length - 1; i++) {
    const prom = Math.min(
      Math.abs(pruned[i].height - pruned[i - 1].height),
      Math.abs(pruned[i].height - pruned[i + 1].height),
    );
    assert.ok(prom >= PROM, `extremum ${i} prominence ${prom.toFixed(3)} < ${PROM}`);
  }
});

test('Normal port (Leith) is unaffected by pruning', () => {
  const raw = new Tide(load('leith.json')).extrema(FROM, TO);
  const pruned = predictExtrema(load('leith.json'), FROM, TO, undefined, PROM);
  assert.equal(pruned.length, raw.length, 'pruning should not touch a metres-range port');
});
