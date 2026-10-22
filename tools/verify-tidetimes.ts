// Check every station's predicted high/low waters against tidetimes.org.uk
// (UKHO-derived predictions), so a refit of the constituents or a recalibrated
// secondary-port shift can be re-checked against an independent source.
//
// Run from apps/mobile (where tsx is installed):
//   cd apps/mobile && node --import tsx ../../tools/verify-tidetimes.ts
//   ... verify-tidetimes.ts --station oban --days 365 --step 1
//
// Options: --from YYYY-MM-DD (default: a year ago), --days N (365), --step N
// (every Nth day, 7), --station ID (all). Pages are cached in tools/.cache, so
// re-runs only fetch what's missing; fetches are spaced a second apart.
// Exits non-zero if any station is outside the limits below.

import { parseArgs } from 'node:util';

import { ukDayStartFromYmd, ymdAddDays, ymdInUk } from '../apps/mobile/lib/datetime';
import { STATIONS } from '../apps/mobile/lib/stations';
import { predictExtrema } from '../apps/mobile/lib/tides';
import { median, nearestSameType, reference, SLUGS } from './tidetimes';

// Pass limits on the median and mean absolute errors. Half of Oban's events land
// within ~6 min of tidetimes after calibration; its reference's own Oban-Tobermory
// difference wanders by ±5 min and ±0.07 m, so much tighter isn't achievable.
const LIMITS = { medianMin: 10, meanAbsMin: 15, medianM: 0.15, meanAbsM: 0.15 };
// A reference event with no prediction of the same type within this is unmatched.
const MATCH_WINDOW_MIN = 90;

const meanAbs = (xs: number[]) => xs.reduce((a, x) => a + Math.abs(x), 0) / xs.length;

async function main() {
  const { values } = parseArgs({
    options: {
      from: { type: 'string', default: ymdAddDays(ymdInUk(new Date()), -365) },
      days: { type: 'string', default: '365' },
      step: { type: 'string', default: '7' },
      station: { type: 'string' },
    },
  });
  const days: string[] = [];
  for (let i = 0; i < Number(values.days); i += Number(values.step)) {
    days.push(ymdAddDays(values.from, i));
  }

  let failed = false;
  console.log(
    `${days.length} days from ${days[0]}; limits: median/mean |Δt| ${LIMITS.medianMin}/${LIMITS.meanAbsMin} min, median/mean |Δh| ${LIMITS.medianM}/${LIMITS.meanAbsM} m\n`,
  );
  console.log('station        n  unmatched   Δt median  mean|Δt|  p90|Δt|   Δh median  mean|Δh|');
  for (const station of STATIONS.filter((s) => !values.station || s.id === values.station)) {
    const slug = SLUGS[station.id];
    if (!slug) {
      console.log(`${station.id.padEnd(13)}  not on tidetimes, skipped`);
      continue;
    }
    const dt: number[] = [];
    const dh: number[] = [];
    let unmatched = 0;
    let unpublished = 0;
    for (const ymd of days) {
      const ref = await reference(slug, ymd);
      if (!ref) {
        unpublished++;
        continue;
      }
      const ours = predictExtrema(
        station.data,
        ukDayStartFromYmd(ymdAddDays(ymd, -1)),
        ukDayStartFromYmd(ymdAddDays(ymd, 2)),
        station.shift,
      );
      for (const r of ref) {
        const near = nearestSameType(r, ours);
        if (!near || Math.abs(near.d) > MATCH_WINDOW_MIN) {
          unmatched++;
          continue;
        }
        dt.push(near.d);
        dh.push(near.e.height - r.height);
      }
    }
    const tsorted = dt.map(Math.abs).sort((a, b) => a - b);
    const row = {
      medianMin: median(dt),
      meanAbsMin: meanAbs(dt),
      p90: tsorted[Math.floor(tsorted.length * 0.9)],
      medianM: median(dh),
      meanAbsM: meanAbs(dh),
    };
    const ok =
      Math.abs(row.medianMin) <= LIMITS.medianMin &&
      row.meanAbsMin <= LIMITS.meanAbsMin &&
      Math.abs(row.medianM) <= LIMITS.medianM &&
      row.meanAbsM <= LIMITS.meanAbsM;
    failed ||= !ok;
    console.log(
      `${station.id.padEnd(13)}${String(dt.length).padStart(4)}${String(unmatched).padStart(11)}` +
        `${row.medianMin.toFixed(1).padStart(12)}${row.meanAbsMin.toFixed(1).padStart(10)}${row.p90.toFixed(0).padStart(9)}` +
        `${row.medianM.toFixed(2).padStart(12)}${row.meanAbsM.toFixed(2).padStart(10)}  ${ok ? 'ok' : 'FAIL'}` +
        (unpublished ? `  (${unpublished} days not on tidetimes yet)` : ''),
    );
  }
  console.log('\nΔ = ours − tidetimes: negative Δt is early, positive Δh is too high.');
  process.exitCode = failed ? 1 : 0;
}

main();
