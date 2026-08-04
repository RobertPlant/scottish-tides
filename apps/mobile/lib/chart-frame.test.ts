// The chart's time axis. The interesting part is the tick labels: they must be
// wall-clock hours, which is not the same as "k hours after midnight" on the two
// BST-transition days.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chartFrame } from './chart-frame';
import { ukDayStartFromYmd, ukEndOfDay } from './datetime';

const labelsFor = (ymd: string) => {
  const t0 = ukDayStartFromYmd(ymd);
  return chartFrame(300, { t0: t0.getTime(), t1: ukEndOfDay(t0).getTime(), height: 200 })
    .hourTicks.map((t) => t.label)
    .join(' ');
};

test('hour ticks are labelled in wall-clock time', () => {
  assert.equal(labelsFor('2026-07-01'), '00 06 12 18 00'); // ordinary 24 h day
  assert.equal(labelsFor('2026-03-29'), '00 07 13 19'); // 23 h: clocks forward at 01:00
  assert.equal(labelsFor('2026-10-25'), '00 05 11 17 23'); // 25 h: clocks back at 02:00
});
