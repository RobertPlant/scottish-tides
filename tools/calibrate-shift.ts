// Recalibrate a secondary port's shift (e.g. Oban from Tobermory) from
// tidetimes.org.uk. Only the *relationship* between the two ports is taken from
// there: each of its secondary-port high/low waters is matched to its own
// base-port one, then
//   - hw_time_min / lw_time_min = median time difference per event type, and
//   - height = height_offset_m + height_scale * base, by least squares.
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
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { ymdAddDays, ymdInUk } from '../apps/mobile/lib/datetime';
import { STATIONS } from '../apps/mobile/lib/stations';
import { median, nearestSameType, type RefEvent, reference, SLUGS } from './tidetimes';

// Matches further apart than this are a different turn of the tide (or a
// double high water), not a calibration signal.
const OUTLIER_MIN = 40;

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
  const station = STATIONS.find((s) => s.id === values.station);
  const slug = SLUGS[values.station];
  const baseSlug = SLUGS[station?.shift?.based_on?.toLowerCase() ?? ''];
  if (!station?.shift || !slug || !baseSlug) {
    throw new Error(`${values.station} isn't a secondary port with tidetimes pages for both ports`);
  }

  const high: number[] = [];
  const low: number[] = [];
  const base: number[] = [];
  const ref: number[] = [];
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
    const baseEvents = baseDays.flatMap((d) => d ?? []);
    for (const r of refs) {
      const near = nearestSameType(r, baseEvents);
      if (!near || Math.abs(near.d) > OUTLIER_MIN) {
        dropped++;
        continue;
      }
      // Shift minutes are reference − base, so the sign flips from `d`.
      (r.type === 'high' ? high : low).push(-near.d);
      base.push(near.e.height);
      ref.push(r.height);
    }
  }

  // Least squares for ref = offset + scale * base.
  const n = base.length;
  const mb = base.reduce((a, x) => a + x, 0) / n;
  const mr = ref.reduce((a, x) => a + x, 0) / n;
  let sbr = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sbr += (base[i] - mb) * (ref[i] - mr);
    sbb += (base[i] - mb) ** 2;
  }
  const scale = sbr / sbb;
  const offset = mr - scale * mb;
  const heightErr = (k: number, c: number) =>
    base.reduce((a, b, i) => a + Math.abs(c + k * b - ref[i]), 0) / n;
  const timeErr = (xs: number[], m: number) =>
    xs.reduce((a, x) => a + Math.abs(x - m), 0) / xs.length;

  const fit = {
    hw_time_min: Math.round(median(high)),
    lw_time_min: Math.round(median(low)),
    height_scale: Number(scale.toFixed(3)),
    height_offset_m: Number(offset.toFixed(3)),
  };
  const cur = station.shift;
  console.log(
    `${station.name} from ${station.shift.based_on}, ${used.length} days ${used[0]} to ${used.at(-1)}: ${high.length} HW + ${low.length} LW matched, ${dropped} dropped (>${OUTLIER_MIN} min or unmatched)\n`,
  );
  console.log('                  current     fit');
  console.log(
    `hw_time_min   ${String(cur.hw_time_min).padStart(10)}${String(fit.hw_time_min).padStart(8)}`,
  );
  console.log(
    `lw_time_min   ${String(cur.lw_time_min).padStart(10)}${String(fit.lw_time_min).padStart(8)}`,
  );
  console.log(
    `height_scale  ${String(cur.height_scale).padStart(10)}${String(fit.height_scale).padStart(8)}`,
  );
  console.log(
    `height_offset ${String(cur.height_offset_m).padStart(10)}${String(fit.height_offset_m).padStart(8)}`,
  );
  console.log(
    `\nmean |error|: HW ${timeErr(high, cur.hw_time_min).toFixed(1)} -> ${timeErr(high, fit.hw_time_min).toFixed(1)} min, ` +
      `LW ${timeErr(low, cur.lw_time_min).toFixed(1)} -> ${timeErr(low, fit.lw_time_min).toFixed(1)} min, ` +
      `height ${heightErr(cur.height_scale, cur.height_offset_m).toFixed(3)} -> ${heightErr(scale, offset).toFixed(3)} m`,
  );

  if (values.write) {
    const file = path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'apps',
      'mobile',
      'assets',
      'data',
      `${station.id}_from_${station.shift.based_on?.toLowerCase()}.json`,
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

main();
