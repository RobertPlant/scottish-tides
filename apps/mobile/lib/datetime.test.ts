// Date/time helpers, with an emphasis on the UK BST/GMT boundaries these tools
// have to get right (every day view keys off them). The UK functions are
// timezone-independent (Intl-based), so these run identically under any host TZ.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  addDays,
  formatDay,
  formatLongDay,
  formatRelative,
  formatTime,
  ukDayStartFromYmd,
  ukStartOfDay,
  ymdAddDays,
  ymdInUk,
} from './datetime';

// 2026 UK DST: BST begins Sun 29 Mar, ends Sun 25 Oct.

test('formatTime renders UK local time (GMT in winter, BST in summer)', () => {
  assert.equal(formatTime(new Date('2026-01-15T09:05:00Z')), '09:05'); // GMT
  assert.equal(formatTime(new Date('2026-07-15T09:05:00Z')), '10:05'); // BST (+1)
});

test('formatDay / formatLongDay format the UK civil date', () => {
  const d = new Date('2026-01-01T12:00:00Z'); // Thursday
  assert.equal(formatDay(d), 'Thu 1 Jan');
  assert.equal(formatLongDay(d), 'Thursday, 1 January 2026');
});

test('addDays adds whole 24h blocks', () => {
  const d = new Date('2026-01-01T00:00:00Z');
  assert.equal(addDays(d, 3).getTime(), d.getTime() + 3 * 86_400_000);
  assert.equal(addDays(d, -1).getTime(), d.getTime() - 86_400_000);
});

test('ymdInUk uses the UK calendar day, not the UTC one', () => {
  // 23:30Z in summer is already the next day in UK (BST +1).
  assert.equal(ymdInUk(new Date('2026-07-03T23:30:00Z')), '2026-07-04');
  // 23:30Z in winter is still the same UK day (GMT).
  assert.equal(ymdInUk(new Date('2026-01-03T23:30:00Z')), '2026-01-03');
  assert.equal(ymdInUk(new Date('2026-07-15T12:00:00Z')), '2026-07-15');
});

test('ymdAddDays is DST-safe pure calendar math', () => {
  assert.equal(ymdAddDays('2026-03-28', 1), '2026-03-29'); // spring-forward day
  assert.equal(ymdAddDays('2026-03-29', 1), '2026-03-30');
  assert.equal(ymdAddDays('2026-10-24', 1), '2026-10-25'); // fall-back day
  assert.equal(ymdAddDays('2026-12-31', 1), '2027-01-01'); // year boundary
  assert.equal(ymdAddDays('2026-03-01', -1), '2026-02-28');
  // Round-trips across a DST edge.
  assert.equal(ymdAddDays(ymdAddDays('2026-03-29', 5), -5), '2026-03-29');
});

test('ukDayStartFromYmd is the UK midnight instant (offset by DST)', () => {
  // Summer: UK midnight is 23:00Z the previous day (BST).
  assert.equal(ukDayStartFromYmd('2026-07-04').toISOString(), '2026-07-03T23:00:00.000Z');
  // Winter: UK midnight is 00:00Z (GMT).
  assert.equal(ukDayStartFromYmd('2026-01-04').toISOString(), '2026-01-04T00:00:00.000Z');
});

test('ukStartOfDay reduces any instant to that UK day midnight', () => {
  assert.equal(
    ukStartOfDay(new Date('2026-07-04T12:00:00Z')).toISOString(),
    '2026-07-03T23:00:00.000Z',
  );
  assert.equal(
    ukStartOfDay(new Date('2026-01-04T12:00:00Z')).toISOString(),
    '2026-01-04T00:00:00.000Z',
  );
  // An instant just past UK midnight in summer still maps to that day's start.
  assert.equal(
    ukStartOfDay(new Date('2026-07-03T23:30:00Z')).toISOString(), // 00:30 BST, 4 Jul
    '2026-07-03T23:00:00.000Z',
  );
});

test('ymd <-> UK-day-start round-trips (incl. DST transition days)', () => {
  for (const ymd of ['2026-01-04', '2026-07-04', '2026-03-29', '2026-10-25']) {
    assert.equal(ymdInUk(ukDayStartFromYmd(ymd)), ymd, `round-trip failed for ${ymd}`);
  }
});

test('formatRelative reads future "in" and past "ago"', () => {
  const now = new Date('2026-01-01T12:00:00Z');
  assert.equal(formatRelative(new Date('2026-01-01T14:14:00Z'), now), 'in 2h 14m');
  assert.equal(formatRelative(new Date('2026-01-01T10:55:00Z'), now), '1h 5m ago');
  assert.equal(formatRelative(new Date('2026-01-01T12:30:00Z'), now), 'in 30m');
  assert.equal(formatRelative(now, now), 'in 0m');
});
