// Tidal-stream estimates: gate races (slack near ref HW/LW, sinusoid between)
// and the Falls of Lora sill model. Deterministic for a fixed day.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ukDayStartFromYmd } from './datetime';
import { predictStreamDay, raceById } from './streams';

const DAY = ukDayStartFromYmd('2026-07-14');

test('raceById finds races and misses unknowns', () => {
  assert.equal(raceById('pentland-firth')?.name, 'Pentland Firth');
  assert.equal(raceById('nope'), undefined);
});

test('gate race: peak scales between neap and spring by the day fraction', () => {
  const race = raceById('pentland-firth');
  assert.ok(race);
  const day = predictStreamDay(race, DAY);

  assert.ok(day.springNeapFraction >= 0 && day.springNeapFraction <= 1);
  // peakRate is exactly neap + fraction·(spring − neap).
  const expected = race.neapPeakKn + day.springNeapFraction * (race.springPeakKn - race.neapPeakKn);
  assert.ok(Math.abs(day.peakRate - expected) < 1e-9);
  assert.ok(day.peakRate >= race.neapPeakKn && day.peakRate <= race.springPeakKn);
});

test('gate race: samples cover the day and never exceed the peak', () => {
  const race = raceById('corryvreckan');
  assert.ok(race);
  const day = predictStreamDay(race, DAY);

  assert.equal(day.samples.length, 97); // 24h at 15-min steps, inclusive
  for (const s of day.samples) {
    assert.ok(Math.abs(s.rate) <= day.peakRate + 1e-9);
  }
  // slacks are chronological.
  for (let i = 1; i < day.slacks.length; i++) {
    assert.ok(day.slacks[i].getTime() >= day.slacks[i - 1].getTime());
  }
});

test('gate race: peaks are signed and named consistently', () => {
  const race = raceById('corryvreckan');
  assert.ok(race);
  const day = predictStreamDay(race, DAY);

  assert.ok(day.peaks.length >= 1);
  for (const p of day.peaks) {
    assert.equal(p.dirName, p.rate > 0 ? race.floodName : race.ebbName);
  }
});

test('sill race (Falls of Lora): valid, range-scaled structure', () => {
  const race = raceById('falls-of-lora');
  assert.ok(race);
  const day = predictStreamDay(race, DAY);

  assert.ok(day.samples.length > 100); // 10-min sampling across the day
  assert.ok(day.peakRate >= 0);
  assert.ok(day.springNeapFraction >= 0 && day.springNeapFraction <= 1);
  for (let i = 1; i < day.slacks.length; i++) {
    assert.ok(day.slacks[i].getTime() >= day.slacks[i - 1].getTime());
  }
});
