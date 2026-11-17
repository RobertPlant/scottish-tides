import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyShift, type Shift, shiftHeight } from './predict';

const SPLIT: Shift = {
  name: 'Split',
  hw_time_min: 0,
  lw_time_min: 0,
  height_scale: 1.2,
  height_offset_m: -1,
  lw_height_scale: 0.8,
  lw_height_offset_m: 0.2,
};
const SINGLE: Shift = { name: 'Single', hw_time_min: 0, lw_time_min: 0, height_scale: 1.1, height_offset_m: -0.1 };
const T0 = new Date('2026-01-01T00:00Z');

test('high and low waters each take their own height map', () => {
  const [high, low] = applyShift(
    [
      { time: T0, height: 5, type: 'high' },
      { time: T0, height: 1, type: 'low' },
    ],
    SPLIT,
  );

  assert.equal(high.height, 5);
  assert.ok(Math.abs(low.height - 1) < 1e-12);
});

test('a shift without an lw_ pair maps low waters like high waters', () => {
  const [low] = applyShift([{ time: T0, height: 1, type: 'low' }], SINGLE);

  assert.ok(Math.abs(low.height - 1) < 1e-12);
});

test('the curve follows the high water map above where the maps cross and the low water one below', () => {
  // the maps cross at 3 m: 1.2 * 3 - 1 = 0.8 * 3 + 0.2 = 2.6
  assert.equal(shiftHeight(5, SPLIT), 5);
  assert.ok(Math.abs(shiftHeight(1, SPLIT) - 1) < 1e-12);
  assert.ok(Math.abs(shiftHeight(3, SPLIT) - 2.6) < 1e-12);
});
