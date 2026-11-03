// Spring/neap classification and range maths that drive the badge and the
// 7-day overview.

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ukDayStartFromYmd, ukEndOfDay, ymdAddDays, ymdInUk } from './datetime';
import { type Station, stationById } from './stations';
import {
  classifyTide,
  dayEvents,
  dayHeightSeries,
  dayRange,
  type TidalStats,
  tidalStats,
} from './tide-day';
import { predictExtrema, type StationData, type TideEvent } from './tides';

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

test('tidalStats scales by the secondary-port height scale', () => {
  const shift = {
    hw_time_min: 0,
    lw_time_min: 0,
    height_scale: 0.8,
    height_offset_m: 0.1,
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
  // 0.8 × 5.0 and 0.8 × 3.0; the offset doesn't change a range.
  assert.equal(springRange, 4.0);
  assert.ok(Math.abs(neapRange - 2.4) < 1e-9);
});

test("a secondary port's day holds exactly its own events", () => {
  const oban = stationById('oban');
  assert.ok(oban);
  // Oban is Tobermory − 9/13 min, so events within the offset of midnight land
  // on the other civil day. 25 Aug 2026 has a 23:53 LW (Tobermory 00:06 on the
  // 26th): before the shift was applied ahead of the window trim, the 25th lost
  // it and the 26th listed it first, out of order.
  const aug25 = dayEvents(oban, ukDayStartFromYmd('2026-08-25'));
  assert.equal(aug25.length, 4);
  assert.equal(aug25[3].type, 'low');
  for (const ymd of ['2026-08-25', '2026-08-26', '2026-08-27']) {
    for (const e of dayEvents(oban, ukDayStartFromYmd(ymd))) {
      assert.equal(ymdInUk(e.time), ymd);
    }
  }
});

test('a UK day is its civil day, not 24 hours (BST transitions)', () => {
  const st = stationById('stornoway');
  assert.ok(st);
  // 29 Mar 2026 is 23 h long and 25 Oct 2026 is 25 h: a fixed +24 h window ran
  // an hour into the 30th (which then showed its 00:03 LW on both days) and
  // stopped an hour short on the 25th.
  for (const ymd of ['2026-03-29', '2026-10-25']) {
    for (const e of dayEvents(st, ukDayStartFromYmd(ymd))) {
      assert.equal(ymdInUk(e.time), ymd);
    }
  }
  // The 25-hour day must still cover its final hour.
  const to = ukEndOfDay(ukDayStartFromYmd('2026-10-25'));
  assert.equal(to.getTime() - ukDayStartFromYmd('2026-10-25').getTime(), 25 * 3600_000);
  assert.equal(ymdInUk(new Date(to.getTime() - 1)), '2026-10-25');
});

test("a secondary port's curve spans its civil day", () => {
  const oban = stationById('oban');
  assert.ok(oban);
  // 3 Jan 2026 has a 23:57 LW. Shifting the samples but not the window ran the
  // curve from 23:49 to 23:49, so that marker fell off the end.
  const dayStart = ukDayStartFromYmd('2026-01-03');
  const series = dayHeightSeries(oban, dayStart);
  const first = series[0].time.getTime();
  const last = series[series.length - 1].time.getTime();
  assert.equal(first, dayStart.getTime());
  assert.equal(last, ukEndOfDay(dayStart).getTime());
  for (const e of dayEvents(oban, dayStart)) {
    assert.ok(e.time.getTime() >= first && e.time.getTime() <= last, e.time.toISOString());
  }
});

test('Port Ellen days join up into one continuous run of events', () => {
  const portEllen = stationById('port-ellen');
  assert.ok(portEllen);
  // Pruning a single day can't see past midnight, so 10 Feb ended on a LW and
  // 11 Feb started on a HW, losing the real 01:47 LW in between.
  const days = Array.from({ length: 90 }, (_, n) => ymdAddDays('2026-01-01', n));
  const perDay = days.flatMap((ymd) => dayEvents(portEllen, ukDayStartFromYmd(ymd)));
  const from = ukDayStartFromYmd(days[0]);
  const to = ukEndOfDay(ukDayStartFromYmd(days[days.length - 1]));
  const continuous = predictExtrema(
    portEllen.data,
    new Date(from.getTime() - 86_400_000),
    new Date(to.getTime() + 86_400_000),
  ).filter((event) => event.time >= from && event.time <= to);
  // the turning-point search lands a minute either way depending on where the window starts
  assert.deepEqual(
    perDay.map((event) => event.type),
    continuous.map((event) => event.type),
  );
  perDay.forEach((event, index) => {
    const driftMs = Math.abs(event.time.getTime() - continuous[index].time.getTime());
    assert.ok(driftMs <= 5 * 60_000, `${event.type} ${event.time.toISOString()}`);
  });
});
