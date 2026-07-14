// Spring/neap classification and range maths that drive the badge and the
// 7-day overview.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { Station } from './stations';
import { classifyTide, dayRange, type TidalStats, tidalStats } from './tide-day';
import type { StationData, TideEvent } from './tides';

const ev = (type: 'high' | 'low', height: number): TideEvent => ({
  type,
  height,
  time: new Date('2026-07-14T00:00:00Z'),
});

test('dayRange = highest high − lowest low', () => {
  const events = [ev('high', 4.0), ev('low', 0.7), ev('high', 3.8), ev('low', 0.9)];
  assert.equal(dayRange(events), 4.0 - 0.7);
});

test('dayRange is 0 when a side is missing', () => {
  assert.equal(dayRange([]), 0);
  assert.equal(dayRange([ev('high', 4.0), ev('high', 3.5)]), 0);
  assert.equal(dayRange([ev('low', 0.5)]), 0);
});

const stats: TidalStats = { springRange: 5, neapRange: 1 };

test('classifyTide anchors neaps=45 and springs=95', () => {
  assert.deepEqual(classifyTide(1, stats), { label: 'Neaps', fraction: 0, coefficient: 45 });
  assert.deepEqual(classifyTide(5, stats), { label: 'Springs', fraction: 1, coefficient: 95 });
  assert.deepEqual(classifyTide(3, stats), { label: 'Mid-range', fraction: 0.5, coefficient: 70 });
});

test('classifyTide label thresholds are 0.34 / 0.66', () => {
  // fraction 0.34 (range = 1 + 4·0.34 = 2.36) is still Neaps; 0.66 is Springs.
  assert.equal(classifyTide(2.36, stats).label, 'Neaps');
  assert.equal(classifyTide(3.64, stats).label, 'Springs');
  assert.equal(classifyTide(2.4, stats).label, 'Mid-range');
});

test('classifyTide clamps fraction [0,1] and coefficient [20,120]', () => {
  const below = classifyTide(-3, stats); // raw = -1
  assert.equal(below.fraction, 0);
  assert.equal(below.label, 'Neaps');
  assert.equal(below.coefficient, 20); // 45 − 50 = −5, clamped up to 20

  const above = classifyTide(9, stats); // raw = 2
  assert.equal(above.fraction, 1);
  assert.equal(above.label, 'Springs');
  assert.equal(above.coefficient, 120); // 45 + 100 = 145, clamped down to 120
});

test('classifyTide handles a degenerate spring==neap span', () => {
  assert.deepEqual(classifyTide(3, { springRange: 2, neapRange: 2 }), {
    label: 'Mid-range',
    fraction: 0.5,
    coefficient: 70,
  });
});

// --- tidalStats -----------------------------------------------------------

const fakeStation = (
  stationName: string,
  cons: { name: string; amplitude: number }[],
  shift?: Station['shift'],
): Station =>
  ({
    id: 'x',
    name: 'x',
    region: 'Clyde',
    lat: 0,
    lon: 0,
    standardPort: !shift,
    shift,
    data: { station: stationName, constituents: cons } as unknown as StationData,
  }) as Station;

test('tidalStats falls back to 2·(M2±S2) when no baked reference', () => {
  const s = fakeStation('__no_ref__', [
    { name: 'M2', amplitude: 2.0 },
    { name: 'S2', amplitude: 0.5 },
  ]);
  const { springRange, neapRange } = tidalStats(s);
  assert.equal(springRange, 5.0); // 2·(2.0 + 0.5)
  assert.equal(neapRange, 3.0); // 2·|2.0 − 0.5|
});

test('tidalStats clamps tiny ranges to sane floors', () => {
  const s = fakeStation('__no_ref__', [{ name: 'M2', amplitude: 0.001 }]);
  const { springRange, neapRange } = tidalStats(s);
  assert.equal(springRange, 0.1);
  assert.equal(neapRange, 0.05);
});

test('tidalStats adds the secondary-port range shift', () => {
  const shift = {
    hw_time_min: 0,
    lw_time_min: 0,
    hw_height_m: 0.5,
    lw_height_m: -0.3,
  } as Station['shift'];
  const s = fakeStation(
    '__no_ref__',
    [
      { name: 'M2', amplitude: 2.0 },
      { name: 'S2', amplitude: 0.5 },
    ],
    shift,
  );
  const { springRange, neapRange } = tidalStats(s);
  // rangeShift = 0.5 − (−0.3) = 0.8 added to both.
  assert.equal(springRange, 5.8);
  assert.equal(neapRange, 3.8);
});
