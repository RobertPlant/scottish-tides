// Nearest-station lookup + great-circle distance.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { haversineKm, nearestStation } from './geo';

test('haversineKm: zero to itself, symmetric, ~111 km per degree of latitude', () => {
  assert.equal(haversineKm(55, -3, 55, -3), 0);

  const oneDegLat = haversineKm(0, 0, 1, 0);
  assert.ok(Math.abs(oneDegLat - 111.19) < 0.5, `1° lat ≈ 111 km, got ${oneDegLat}`);

  assert.ok(
    Math.abs(haversineKm(56, -5, 57, -3) - haversineKm(57, -3, 56, -5)) < 1e-9,
    'distance must be symmetric',
  );
});

test('haversineKm: a degree of longitude shrinks with latitude', () => {
  const atEquator = haversineKm(0, 0, 0, 1); // ~111 km
  const at60 = haversineKm(60, 0, 60, 1); // ~55.6 km
  assert.ok(Math.abs(atEquator - 111.19) < 0.5);
  assert.ok(Math.abs(at60 - 111.19 * Math.cos((60 * Math.PI) / 180)) < 0.5);
});

test('nearestStation snaps to the closest bundled port', () => {
  const near = nearestStation(58.2, -6.39); // the e2e geolocation point
  assert.equal(near.station.id, 'stornoway');
  assert.ok(near.km < 5, `expected < 5 km, got ${near.km}`);

  assert.equal(nearestStation(55.99, -3.18).station.id, 'leith'); // Edinburgh
  assert.equal(nearestStation(57.14, -2.08).station.id, 'aberdeen');
});

test('nearestStation at a station location is ~0 km away', () => {
  const s = nearestStation(58.2073, -6.3887); // Stornoway exact coordinates
  assert.equal(s.station.id, 'stornoway');
  assert.ok(s.km < 0.5, `expected ~0 km, got ${s.km}`);
});
