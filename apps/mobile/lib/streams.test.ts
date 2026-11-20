// Tidal-stream estimates: gate races (slack near ref HW/LW, sinusoid between)
// Deterministic for a fixed day.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ukDayStartFromYmd, ymdAddDays } from './datetime';
import { getReferenceStation, predictStreamDay, RACES, raceById } from './streams';
import { dayEvents } from './tide-day';

const DAY = ukDayStartFromYmd('2026-07-14');

test('every race has a reference station', () => {
  for (const race of RACES) {
    assert.ok(getReferenceStation(race), race.id);
  }
});

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

test('Falls of Lora: the falls run out from HW Oban +2:10 and in from LW Oban +2:50', () => {
  const race = raceById('falls-of-lora');
  assert.ok(race);
  const day = predictStreamDay(race, DAY);
  const oban = getReferenceStation(race);
  const turns = dayEvents(oban, DAY);

  for (const slack of day.slacks) {
    const minutesAfter = turns.map(turn => ({ turn, minutes: (slack.getTime() - turn.time.getTime()) / 60_000 }));
    const match = minutesAfter.find(({ minutes }) => minutes === 130 || minutes === 170);
    assert.ok(match, slack.toISOString());
    assert.equal(match.turn.type === 'high', match.minutes === 130);
  }
});

test('Falls of Lora: peaks run flood, ebb, flood across midnight with no day-edge copies', () => {
  const race = raceById('falls-of-lora');
  assert.ok(race);

  const ymds = Array.from({ length: 60 }, (_, offset) => ymdAddDays('2026-01-01', offset));
  const peaks = ymds.flatMap(ymd => predictStreamDay(race, ukDayStartFromYmd(ymd)).peaks);
  const repeats = peaks.slice(1).filter((peak, index) => Math.sign(peak.rate) === Math.sign(peaks[index].rate));

  assert.deepEqual(
    repeats.map(peak => peak.time.toISOString()),
    [],
  );
});
