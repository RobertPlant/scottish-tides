// Recalibrate a secondary port's shift (e.g. Oban from Tobermory) from
// tidetimes.org.uk. Only the *relationship* between the two ports is taken from
// there: each of its secondary-port high/low waters is matched to its own
// base-port one, then
//   - hw_time_min / lw_time_min = median time difference per event type, and
//   - height = height_offset_m + height_scale * base, by least squares, with
//     low waters fitted on their own into lw_height_scale / lw_height_offset_m.
// The app applies that to our gauge-fitted base port. Fitting tidetimes' Oban
// straight against our Tobermory would also absorb the gap between our gauge
// fit and UKHO's predictions (mean sea level epoch), dragging Oban onto UKHO's
// datum while Tobermory stays on the gauge's.
// Medians because a few events per year mismatch badly (flat neap turns).
//
// Run from apps/mobile (where tsx is installed):
//   cd apps/mobile && node --import tsx ../../tools/calibrate-shift.ts --station oban
//   ... --write   to update the shift JSON in place
//
// Options: --from YYYY-MM-DD and --days N (default: the 15 months tidetimes
// covers, 1 Oct 2025 – 31 Dec 2026), --step N (every Nth day, 1). Fetches go
// through tools/.cache, a second apart; a fresh 15-month run takes ~8 min.
// Then check the result with tools/verify-tidetimes.ts.

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import { ymdAddDays, ymdInUk } from '../apps/mobile/lib/datetime';
import { STATIONS } from '../apps/mobile/lib/stations';
import { getHeightMap } from '../apps/mobile/lib/tides';
import { mean, median, nearestSameType, type RefEvent, reference, SLUGS } from './tidetimes';

type Line = { scale: number; offset: number };
type Pair = { base: number; ref: number };

// Matches further apart than this are a different turn of the tide (or a
// double high water), not a calibration signal.
const OUTLIER_MIN = 40;

// Least squares for ref = offset + scale * base.
const fitLine = (pairs: Pair[]): Line => {
  const meanBase = mean(pairs.map(pair => pair.base));
  const meanRef = mean(pairs.map(pair => pair.ref));
  const covariance = pairs.reduce((sum, pair) => sum + (pair.base - meanBase) * (pair.ref - meanRef), 0);
  const variance = pairs.reduce((sum, pair) => sum + (pair.base - meanBase) ** 2, 0);
  const scale = covariance / variance;

  return { scale, offset: meanRef - scale * meanBase };
};

const sumAbsError = (pairs: Pair[], line: Line) =>
  pairs.reduce((sum, pair) => sum + Math.abs(line.offset + line.scale * pair.base - pair.ref), 0);

async function main() {
  const { values } = parseArgs({
    options: {
      station: { type: 'string', default: 'oban' },
      from: { type: 'string', default: '2025-10-01' },
      days: { type: 'string', default: '457' },
      step: { type: 'string', default: '1' },
      write: { type: 'boolean', default: false },
    },
  });
  const station = STATIONS.find(s => s.id === values.station);
  const slug = SLUGS[values.station];
  const baseSlug = SLUGS[station?.shift?.based_on?.toLowerCase() ?? ''];
  if (!station?.shift || !slug || !baseSlug) {
    throw new Error(`${values.station} isn't a secondary port with tidetimes pages for both ports`);
  }

  const high: number[] = [];
  const low: number[] = [];
  const pairs: { type: 'high' | 'low'; base: number; ref: number }[] = [];
  let dropped = 0;
  const used: string[] = [];
  const days = Number(values.days);
  for (let i = 0; i < days; i += Number(values.step)) {
    const ymd = ymdAddDays(values.from, i);
    const refs = await reference(slug, ymd);
    // The base port's neighbouring days too, for events near midnight.
    const baseDays: (RefEvent[] | null)[] = [];
    for (const n of [-1, 0, 1]) {
      baseDays.push(await reference(baseSlug, ymdAddDays(ymd, n)));
    }
    if (!refs || !baseDays[1]) {
      continue;
    }
    used.push(ymd);
    const baseEvents = baseDays.flatMap(d => d ?? []);
    for (const r of refs) {
      const near = nearestSameType(r, baseEvents);
      if (!near || Math.abs(near.d) > OUTLIER_MIN) {
        dropped++;
        continue;
      }
      // Shift minutes are reference − base, so the sign flips from `d`.
      (r.type === 'high' ? high : low).push(-near.d);
      pairs.push({ type: r.type, base: near.e.height, ref: r.height });
    }
  }

  const highPairs = pairs.filter(pair => pair.type === 'high');
  const lowPairs = pairs.filter(pair => pair.type === 'low');
  const hwFit = fitLine(highPairs);
  const lwFit = fitLine(lowPairs);
  const n = pairs.length;
  const heightErr = (hw: Line, lw: Line) => (sumAbsError(highPairs, hw) + sumAbsError(lowPairs, lw)) / n;
  const timeErr = (xs: number[], m: number) => xs.reduce((a, x) => a + Math.abs(x - m), 0) / xs.length;

  const fit = {
    hw_time_min: Math.round(median(high)),
    lw_time_min: Math.round(median(low)),
    height_scale: Number(hwFit.scale.toFixed(3)),
    height_offset_m: Number(hwFit.offset.toFixed(3)),
    lw_height_scale: Number(lwFit.scale.toFixed(3)),
    lw_height_offset_m: Number(lwFit.offset.toFixed(3)),
  };
  const cur = station.shift;
  const curLw = getHeightMap(cur, 'low');
  console.log(
    `${station.name} from ${station.shift.based_on}, ${used.length} days ${used[0]} to ${used.at(-1)}: ${high.length} HW + ${low.length} LW matched, ${dropped} dropped (>${OUTLIER_MIN} min or unmatched)\n`,
  );
  console.log('                  current     fit');
  console.log(`hw_time_min   ${String(cur.hw_time_min).padStart(10)}${String(fit.hw_time_min).padStart(8)}`);
  console.log(`lw_time_min   ${String(cur.lw_time_min).padStart(10)}${String(fit.lw_time_min).padStart(8)}`);
  console.log(`height_scale  ${String(cur.height_scale).padStart(10)}${String(fit.height_scale).padStart(8)}`);
  console.log(`height_offset ${String(cur.height_offset_m).padStart(10)}${String(fit.height_offset_m).padStart(8)}`);
  console.log(`lw_scale      ${String(curLw.scale).padStart(10)}${String(fit.lw_height_scale).padStart(8)}`);
  console.log(`lw_offset     ${String(curLw.offset).padStart(10)}${String(fit.lw_height_offset_m).padStart(8)}`);
  console.log(
    `\nmean |error|: HW ${timeErr(high, cur.hw_time_min).toFixed(1)} -> ${timeErr(high, fit.hw_time_min).toFixed(1)} min, ` +
      `LW ${timeErr(low, cur.lw_time_min).toFixed(1)} -> ${timeErr(low, fit.lw_time_min).toFixed(1)} min, ` +
      `height ${heightErr(getHeightMap(cur, 'high'), curLw).toFixed(3)} -> ${heightErr(hwFit, lwFit).toFixed(3)} m`,
  );

  if (values.write) {
    const file = path.join(
      import.meta.dirname,
      '..',
      'apps',
      'mobile',
      'assets',
      'data',
      `${station.id.replaceAll('-', '_')}_from_${station.shift.based_on?.toLowerCase()}.json`,
    );
    const json = JSON.parse(readFileSync(file, 'utf8'));
    Object.assign(json, fit, {
      calibrated_from: `tidetimes.org.uk ${station.name} vs ${station.shift.based_on}, ${used[0]} to ${used.at(-1)} (every ${values.step} day(s), ${n} events) via tools/calibrate-shift.ts`,
      calibrated_on: ymdInUk(new Date()),
    });
    writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
    console.log(`\nwrote ${path.relative(process.cwd(), file)}`);
  }
}

void main();
