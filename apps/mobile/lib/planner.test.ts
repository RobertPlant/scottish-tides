// Calendar layout + colour-ramp maths behind the month/year trip planner.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { coeffFill, daysInMonth, monthDays, yearMonths } from './planner';
import { STATIONS } from './stations';

const station = STATIONS[0];

test('daysInMonth handles month lengths and leap Februaries', () => {
  assert.equal(daysInMonth(2026, 1), 31);
  assert.equal(daysInMonth(2026, 4), 30);
  assert.equal(daysInMonth(2026, 2), 28);
  assert.equal(daysInMonth(2024, 2), 29); // leap year
});

test('monthDays returns every day in order with correct fields', () => {
  const days = monthDays(station, 2026, 7);
  assert.equal(days.length, 31);
  assert.equal(days[0].ymd, '2026-07-01');
  assert.equal(days[30].ymd, '2026-07-31');
  assert.deepEqual(
    days.map((d) => d.day),
    Array.from({ length: 31 }, (_, i) => i + 1),
  );
  // 2026-07-01 is a Wednesday → Monday-first index 2, not a weekend.
  assert.equal(days[0].weekday, 2);
  assert.equal(days[0].isWeekend, false);
  // 2026-07-04 is a Saturday, 05 a Sunday.
  assert.equal(days[3].weekday, 5);
  assert.equal(days[3].isWeekend, true);
  assert.equal(days[4].weekday, 6);
  assert.equal(days[4].isWeekend, true);
  // 2026-07-06 is a Monday again.
  assert.equal(days[5].weekday, 0);
  assert.equal(days[5].isWeekend, false);
});

test('yearMonths covers all twelve months with correct day counts', () => {
  const months = yearMonths(station, 2024); // leap year
  assert.equal(months.length, 12);
  assert.deepEqual(
    months.map((m) => m.month),
    Array.from({ length: 12 }, (_, i) => i + 1),
  );
  assert.equal(months[1].days.length, 29); // Feb 2024
  assert.equal(months[0].days.length, 31);
  assert.equal(months[3].days.length, 30);
});

test('coeffFill ramps neaps→springs with readable ink', () => {
  const lo = coeffFill(0, 'light');
  const hi = coeffFill(1, 'light');
  assert.equal(lo.bg, 'rgb(220, 235, 234)'); // pale teal
  assert.equal(hi.bg, 'rgb(14, 110, 106)'); // deep teal
  assert.equal(lo.ink, '#0c1722'); // dark ink on a light fill
  assert.equal(hi.ink, '#ffffff'); // light ink on a dark fill
  // Dark theme: dim → bright.
  assert.equal(coeffFill(0, 'dark').bg, 'rgb(18, 55, 52)');
  assert.equal(coeffFill(1, 'dark').bg, 'rgb(99, 214, 208)');
});

test('coeffFill clamps out-of-range fractions to the endpoints', () => {
  assert.deepEqual(coeffFill(-1, 'light'), coeffFill(0, 'light'));
  assert.deepEqual(coeffFill(2, 'light'), coeffFill(1, 'light'));
});
