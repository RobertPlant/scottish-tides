// Sun (daylight window) and moon (phase/illumination) — planning-grade accuracy.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { moonInfo, sunTimes } from './astronomy';

const DAY_MS = 86_400_000;
const SYNODIC = 29.530588853;
// The reference new moon baked into astronomy.ts (JD 2451550.1).
const NEW_MOON = new Date((2451550.1 - 2440587.5) * DAY_MS);

test('moonInfo: cardinal phases land on their names and illumination', () => {
  const nm = moonInfo(NEW_MOON);
  assert.equal(nm.name, 'New moon');
  assert.equal(nm.emoji, '🌑');
  assert.ok(nm.illumination < 0.01 && nm.phase < 0.01);

  const full = moonInfo(new Date(NEW_MOON.getTime() + (SYNODIC / 2) * DAY_MS));
  assert.equal(full.name, 'Full moon');
  assert.ok(full.illumination > 0.99);

  const firstQ = moonInfo(new Date(NEW_MOON.getTime() + (SYNODIC / 4) * DAY_MS));
  assert.equal(firstQ.name, 'First quarter');
  assert.ok(Math.abs(firstQ.illumination - 0.5) < 0.02);

  const lastQ = moonInfo(new Date(NEW_MOON.getTime() + ((3 * SYNODIC) / 4) * DAY_MS));
  assert.equal(lastQ.name, 'Last quarter');
});

test('moonInfo: phase and illumination stay in range (incl. before the epoch)', () => {
  for (const offsetDays of [-40, -1, 0, 3, 15, 200]) {
    const info = moonInfo(new Date(NEW_MOON.getTime() + offsetDays * DAY_MS));
    assert.ok(info.phase >= 0 && info.phase < 1, `phase out of range: ${info.phase}`);
    assert.ok(
      info.illumination >= 0 && info.illumination <= 1,
      `illumination out of range: ${info.illumination}`,
    );
  }
});

test('sunTimes: long Scottish midsummer day, short midwinter day', () => {
  const lat = 55.99;
  const lon = -3.18; // Edinburgh

  const summer = sunTimes(new Date('2026-06-21T12:00:00Z'), lat, lon);
  assert.ok(summer.sunrise && summer.sunset);
  assert.ok(summer.sunrise.getTime() < summer.sunset.getTime());
  assert.ok(
    summer.daylightMinutes > 1000 && summer.daylightMinutes < 1120,
    `midsummer daylight ~17.5h, got ${summer.daylightMinutes} min`,
  );

  const winter = sunTimes(new Date('2026-12-21T12:00:00Z'), lat, lon);
  assert.ok(
    winter.daylightMinutes > 380 && winter.daylightMinutes < 460,
    `midwinter daylight ~7h, got ${winter.daylightMinutes} min`,
  );
});

test('sunTimes: polar day and polar night', () => {
  const polarDay = sunTimes(new Date('2026-06-21T12:00:00Z'), 80, 0);
  assert.equal(polarDay.alwaysUp, true);
  assert.equal(polarDay.sunrise, null);
  assert.equal(polarDay.daylightMinutes, 24 * 60);

  const polarNight = sunTimes(new Date('2026-12-21T12:00:00Z'), 80, 0);
  assert.equal(polarNight.alwaysUp, false);
  assert.equal(polarNight.sunrise, null);
  assert.equal(polarNight.daylightMinutes, 0);
});
