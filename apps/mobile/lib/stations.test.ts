import assert from 'node:assert/strict';
import { test } from 'node:test';

import { listMatchingStations, STATIONS } from './stations';

const listNames = (query: string) => listMatchingStations(STATIONS, query).map(station => station.name);

test('listMatchingStations: matches name, subtitle and region, ignoring case and spaces', () => {
  assert.deepEqual(listNames('  OBAN '), ['Oban']);
  assert.deepEqual(listNames('skye'), ['Portree', 'Uig']);
  assert.ok(listNames('clyde').includes('Campbeltown'), 'region matches');
});

test('listMatchingStations: an empty query keeps every station, a miss keeps none', () => {
  assert.equal(listNames('').length, STATIONS.length);
  assert.deepEqual(listNames('atlantis'), []);
});
