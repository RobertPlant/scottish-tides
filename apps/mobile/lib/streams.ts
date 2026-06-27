// Tidal STREAMS for the well-known races — an estimate, not an atlas.
//
// IMPORTANT: this is a planning aid, NOT a tidal stream atlas. The model is
// deliberately simple and uses *published* peak rates (common knowledge, not
// Admiralty's copyrighted tables):
//   - a race goes slack near the reference port's HW/LW (± an offset),
//   - the rate follows a sinusoid between slacks (the "50/90" idea),
//   - the peak scales between the race's neap and spring figures by the day's
//     spring/neap fraction (from the tide engine).
// Slack timing and direction are approximate — verify against the pilot/atlas.
// These races (Corryvreckan, Pentland Firth) can kill.

import { stationById } from '@/lib/stations';
import { classifyTide, dayEvents, dayRange, tidalStats } from '@/lib/tide-day';
import { predictExtrema } from '@/lib/tides';

export interface Race {
  id: string;
  name: string;
  area: string;
  lat: number;
  lon: number;
  /** Bundled station whose HW/LW times the streams are keyed to. */
  referenceStationId: string;
  /** Slack near the reference HW / LW, offset in minutes (approx). */
  slackAtHwOffsetMin: number;
  slackAtLwOffsetMin: number;
  /** True if the "flood" runs during the rising tide (LW→HW) at the reference. */
  floodFromLwToHw: boolean;
  floodName: string;
  ebbName: string;
  springPeakKn: number;
  neapPeakKn: number;
  /** Race-specific hazard note. */
  warning: string;
  source: string;
}

export const RACES: Race[] = [
  {
    id: 'pentland-firth',
    name: 'Pentland Firth',
    area: 'Caithness — Orkney',
    lat: 58.72,
    lon: -3.15,
    referenceStationId: 'wick',
    slackAtHwOffsetMin: 0,
    slackAtLwOffsetMin: 0,
    floodFromLwToHw: true,
    floodName: 'W-going',
    ebbName: 'E-going',
    springPeakKn: 12,
    neapPeakKn: 6,
    warning:
      'One of the most dangerous tidal passages in Britain — overfalls (the Merry Men of Mey, Swelkie) build huge seas against wind. Transit only at slack with a firm escape plan.',
    source: 'Published peak ~12 kn springs (indicative).',
  },
  {
    id: 'corryvreckan',
    name: 'Gulf of Corryvreckan',
    area: 'Jura — Scarba',
    lat: 56.15,
    lon: -5.71,
    referenceStationId: 'oban',
    slackAtHwOffsetMin: 0,
    slackAtLwOffsetMin: 0,
    floodFromLwToHw: true,
    floodName: 'Flood (E-going)',
    ebbName: 'Ebb (W-going)',
    springPeakKn: 8.5,
    neapPeakKn: 4,
    warning:
      'The whirlpool — standing waves and the famous overfall on the west-going stream against swell. Slack window is short. Expert only.',
    source: 'Published peak ~8.5 kn springs (indicative).',
  },
  {
    id: 'grey-dogs',
    name: "Grey Dogs (Bealach a' Choin Ghlais)",
    area: 'Scarba — Lunga',
    lat: 56.18,
    lon: -5.67,
    referenceStationId: 'oban',
    slackAtHwOffsetMin: 0,
    slackAtLwOffsetMin: 0,
    floodFromLwToHw: true,
    floodName: 'Flood (E-going)',
    ebbName: 'Ebb (W-going)',
    springPeakKn: 8,
    neapPeakKn: 4,
    warning: 'A narrow, fierce gap with a permanent standing wave near peak flow. Slack only.',
    source: 'Published peak ~8 kn springs (indicative).',
  },
  {
    id: 'falls-of-lora',
    name: 'Falls of Lora',
    area: 'Connel, mouth of Loch Etive',
    lat: 56.45,
    lon: -5.39,
    referenceStationId: 'oban',
    slackAtHwOffsetMin: 75,
    slackAtLwOffsetMin: 75,
    floodFromLwToHw: true,
    floodName: 'In-flowing (flood)',
    ebbName: 'Out-flowing (the falls)',
    springPeakKn: 7,
    neapPeakKn: 2,
    warning:
      'A tidal rapid over a rock ledge; the falls run hard on the ebb after HW. Strongly range-dependent — negligible on small neaps, violent on big springs.',
    source: 'Published peak ~7 kn springs (indicative); slack lags HW/LW Oban.',
  },
  {
    id: 'dorus-mor',
    name: 'Dorus Mòr',
    area: 'Craignish, near Crinan',
    lat: 56.11,
    lon: -5.61,
    referenceStationId: 'oban',
    slackAtHwOffsetMin: 0,
    slackAtLwOffsetMin: 0,
    floodFromLwToHw: true,
    floodName: 'N-going (flood)',
    ebbName: 'S-going (ebb)',
    springPeakKn: 8,
    neapPeakKn: 4,
    warning: 'Strong, with overfalls off the point; gateway to the Sound of Jura races.',
    source: 'Published peak ~8 kn springs (indicative).',
  },
  {
    id: 'sound-of-islay',
    name: 'Sound of Islay',
    area: 'Islay — Jura',
    lat: 55.86,
    lon: -6.1,
    referenceStationId: 'port-ellen',
    slackAtHwOffsetMin: 0,
    slackAtLwOffsetMin: 0,
    floodFromLwToHw: true,
    floodName: 'N-going (flood)',
    ebbName: 'S-going (ebb)',
    springPeakKn: 5,
    neapPeakKn: 2.5,
    warning: 'A steady, strong tidal river — time a transit with the stream, not against.',
    source: 'Published peak ~5 kn springs (indicative).',
  },
];

export function raceById(id: string): Race | undefined {
  return RACES.find((r) => r.id === id);
}

export interface StreamSample {
  time: Date;
  /** Signed rate in knots: + = flood direction, − = ebb. */
  rate: number;
}

export interface StreamPeak {
  time: Date;
  rate: number; // signed
  dirName: string;
}

export interface StreamDay {
  samples: StreamSample[];
  slacks: Date[];
  peaks: StreamPeak[];
  /** 0 = neaps, 1 = springs. */
  springNeapFraction: number;
  /** Peak magnitude for the day (kn). */
  peakRate: number;
}

interface Segment {
  s0: number; // ms
  s1: number; // ms
  flood: boolean;
}

/** Stream estimate for a race over the UK civil day starting at `dayStart`. */
export function predictStreamDay(race: Race, dayStart: Date): StreamDay {
  const ref = stationById(race.referenceStationId);
  if (!ref) {
    return { samples: [], slacks: [], peaks: [], springNeapFraction: 0, peakRate: 0 };
  }

  const from = new Date(dayStart.getTime() - 9 * 3600_000);
  const to = new Date(dayStart.getTime() + 33 * 3600_000);
  const events = predictExtrema(ref.data, from, to, ref.shift);

  // Spring/neap fraction from the reference port's day, scaling the peak rate.
  const fraction = classifyTide(dayRange(dayEvents(ref, dayStart)), tidalStats(ref)).fraction;
  const peakRate = race.neapPeakKn + fraction * (race.springPeakKn - race.neapPeakKn);

  // Slack times: near each reference HW/LW, offset.
  const slacks = events
    .map((e) => ({
      t: e.time.getTime() + (e.type === 'high' ? race.slackAtHwOffsetMin : race.slackAtLwOffsetMin) * 60_000,
      afterLow: e.type === 'low',
    }))
    .sort((a, b) => a.t - b.t);

  // Segments between consecutive slacks; a rising-tide segment (starts at an
  // LW-slack) is flood iff floodFromLwToHw.
  const segments: Segment[] = [];
  for (let i = 0; i < slacks.length - 1; i++) {
    const rising = slacks[i].afterLow; // LW-slack starts a rising segment
    segments.push({ s0: slacks[i].t, s1: slacks[i + 1].t, flood: rising === race.floodFromLwToHw });
  }

  const rateAt = (t: number): number => {
    for (const seg of segments) {
      if (t >= seg.s0 && t <= seg.s1) {
        const mag = peakRate * Math.sin((Math.PI * (t - seg.s0)) / (seg.s1 - seg.s0));
        return seg.flood ? mag : -mag;
      }
    }
    return 0;
  };

  const start = dayStart.getTime();
  const end = start + 24 * 3600_000;
  const samples: StreamSample[] = [];
  for (let t = start; t <= end; t += 15 * 60_000) {
    samples.push({ time: new Date(t), rate: rateAt(t) });
  }

  const daySlacks = slacks.filter((s) => s.t >= start && s.t <= end).map((s) => new Date(s.t));

  const peaks: StreamPeak[] = segments
    .map((seg) => {
      const mid = (seg.s0 + seg.s1) / 2;
      return { time: new Date(mid), rate: seg.flood ? peakRate : -peakRate, dirName: seg.flood ? race.floodName : race.ebbName };
    })
    .filter((p) => p.time.getTime() >= start && p.time.getTime() <= end);

  return { samples, slacks: daySlacks, peaks, springNeapFraction: fraction, peakRate };
}
