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

import { type Station, stationById } from '@/lib/stations';
import { classifyTide, dayEvents, dayRange, seaLevelSeries, tidalStats } from '@/lib/tide-day';
import { predictExtrema } from '@/lib/tides';

export interface Race {
  id: string;
  name: string;
  area: string;
  lat: number;
  lon: number;
  /** Bundled station whose tide drives the streams. */
  referenceStationId: string;
  /**
   * 'gate' — a strait that goes slack near the reference HW/LW (Pentland etc.).
   * 'sill' — a basin behind a rock sill (Falls of Lora): the rate follows the
   * head between the sea and the lagged loch level, giving asymmetric windows.
   */
  type: 'gate' | 'sill';
  floodName: string;
  ebbName: string;
  springPeakKn: number;
  neapPeakKn: number;
  /** Race-specific hazard note. */
  warning: string;
  source: string;

  // gate-type only:
  /** Slack near the reference HW / LW, offset in minutes (approx). */
  slackAtHwOffsetMin?: number;
  slackAtLwOffsetMin?: number;
  /** True if the "flood" runs during the rising tide (LW→HW) at the reference. */
  floodFromLwToHw?: boolean;

  // sill-type only: the basin lags the sea, and (because the sill restricts
  // outflow) drains slower than it fills — an asymmetric low-pass.
  lochTauFillHours?: number;
  lochTauDrainHours?: number;
  /** Knots of stream per metre of head (sea − loch). */
  headRateScale?: number;
}

export const RACES: Race[] = [
  {
    id: 'pentland-firth',
    name: 'Pentland Firth',
    area: 'Caithness — Orkney',
    lat: 58.72,
    lon: -3.15,
    referenceStationId: 'aberdeen',
    type: 'gate',
    slackAtHwOffsetMin: -65,
    slackAtLwOffsetMin: -72,
    floodFromLwToHw: false,
    floodName: 'W-going',
    ebbName: 'E-going',
    springPeakKn: 12,
    neapPeakKn: 6,
    warning:
      'One of the most dangerous tidal passages in Britain — overfalls (the Merry Men of Mey, Swelkie) build huge seas against wind. Transit only at slack with a firm escape plan.',
    source:
      'Slack ≈ HW Aberdeen −1:05 (W-going begins) / +5:00 (E-going begins), from published figures; peak ~12 kn springs.',
  },
  {
    id: 'corryvreckan',
    name: 'Gulf of Corryvreckan',
    area: 'Jura — Scarba',
    lat: 56.15,
    lon: -5.71,
    referenceStationId: 'oban',
    type: 'gate',
    slackAtHwOffsetMin: -140,
    slackAtLwOffsetMin: -127,
    floodFromLwToHw: true,
    floodName: 'W-going',
    ebbName: 'E-going',
    springPeakKn: 8.5,
    neapPeakKn: 4,
    warning:
      'The whirlpool — standing waves and the famous overfall on the west-going stream against swell. Slack window is short. Expert only.',
    source:
      'Slack ≈ HW Oban +4:00 / −2:30; W-going begins HW +4:10 (8.5 kn), E-going HW −2:10. From published figures.',
  },
  {
    id: 'grey-dogs',
    name: "Grey Dogs (Bealach a' Choin Ghlais)",
    area: 'Scarba — Lunga',
    lat: 56.18,
    lon: -5.67,
    referenceStationId: 'oban',
    type: 'gate',
    slackAtHwOffsetMin: -140,
    slackAtLwOffsetMin: -127,
    floodFromLwToHw: true,
    floodName: 'W-going',
    ebbName: 'E-going',
    springPeakKn: 8,
    neapPeakKn: 4,
    warning: 'A narrow, fierce gap with a permanent standing wave near peak flow. Slack only.',
    source: 'Timing taken as the adjacent Corryvreckan (approximate); peak ~8 kn springs.',
  },
  {
    id: 'falls-of-lora',
    name: 'Falls of Lora',
    area: 'Connel, mouth of Loch Etive',
    lat: 56.45,
    lon: -5.39,
    referenceStationId: 'oban',
    type: 'sill',
    floodName: 'In-flowing (flood)',
    ebbName: 'Out-flowing (the falls)',
    springPeakKn: 7,
    neapPeakKn: 2,
    lochTauFillHours: 3.5,
    lochTauDrainHours: 8,
    headRateScale: 3.0,
    warning:
      'A tidal rapid over a rock ledge: the falls run OUT on the ebb once the falling sea drops below Loch Etive, then IN on the flood. Strongly range-dependent — negligible on small neaps, violent on big springs.',
    source:
      'Modelled from the sea↔loch head; turn times calibrated to fallsoflora.info (XTide) to ~12 min. Rate magnitude indicative.',
  },
  {
    id: 'dorus-mor',
    name: 'Dorus Mòr',
    area: 'Craignish, near Crinan',
    lat: 56.11,
    lon: -5.61,
    referenceStationId: 'oban',
    type: 'gate',
    slackAtHwOffsetMin: -90,
    slackAtLwOffsetMin: -90,
    floodFromLwToHw: true,
    floodName: 'N-going (flood)',
    ebbName: 'S-going (ebb)',
    springPeakKn: 8,
    neapPeakKn: 4,
    warning: 'Strong, with overfalls off the point; gateway to the Sound of Jura races.',
    source: 'Slack ≈ 1½ h before HW/LW Oban; NW flood from ~HW +3:30. From published figures.',
  },
  {
    id: 'sound-of-islay',
    name: 'Sound of Islay',
    area: 'Islay — Jura',
    lat: 55.86,
    lon: -6.1,
    referenceStationId: 'oban',
    type: 'gate',
    slackAtHwOffsetMin: -40,
    slackAtLwOffsetMin: -42,
    floodFromLwToHw: true,
    floodName: 'N-going (flood)',
    ebbName: 'S-going (ebb)',
    springPeakKn: 5,
    neapPeakKn: 2.5,
    warning: 'A steady, strong tidal river — time a transit with the stream, not against.',
    source: 'Slack ≈ HW Oban −0:40 / +5:30 (Rhinns-of-Islay figures, approximate); peak ~5 kn springs.',
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
  const fraction = classifyTide(dayRange(dayEvents(ref, dayStart)), tidalStats(ref)).fraction;
  return race.type === 'sill'
    ? predictSill(race, ref, dayStart, fraction)
    : predictGate(race, ref, dayStart, fraction);
}

// --- 'gate' races: slack near reference HW/LW, sinusoid between -----------------

function predictGate(race: Race, ref: Station, dayStart: Date, fraction: number): StreamDay {
  const from = new Date(dayStart.getTime() - 9 * 3600_000);
  const to = new Date(dayStart.getTime() + 33 * 3600_000);
  const events = predictExtrema(ref.data, from, to, ref.shift);
  const peakRate = race.neapPeakKn + fraction * (race.springPeakKn - race.neapPeakKn);
  const hwOff = race.slackAtHwOffsetMin ?? 0;
  const lwOff = race.slackAtLwOffsetMin ?? 0;
  const floodFromLwToHw = race.floodFromLwToHw ?? true;

  const slacks = events
    .map((e) => ({
      t: e.time.getTime() + (e.type === 'high' ? hwOff : lwOff) * 60_000,
      afterLow: e.type === 'low',
    }))
    .sort((a, b) => a.t - b.t);

  const segments: Segment[] = [];
  for (let i = 0; i < slacks.length - 1; i++) {
    const rising = slacks[i].afterLow; // LW-slack starts a rising segment
    segments.push({ s0: slacks[i].t, s1: slacks[i + 1].t, flood: rising === floodFromLwToHw });
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
    .map((seg) => ({
      time: new Date((seg.s0 + seg.s1) / 2),
      rate: seg.flood ? peakRate : -peakRate,
      dirName: seg.flood ? race.floodName : race.ebbName,
    }))
    .filter((p) => p.time.getTime() >= start && p.time.getTime() <= end);

  return { samples, slacks: daySlacks, peaks, springNeapFraction: fraction, peakRate };
}

// --- 'sill' races (Falls of Lora): rate ∝ head between sea and lagged loch -----

function predictSill(race: Race, ref: Station, dayStart: Date, fraction: number): StreamDay {
  const tauFill = race.lochTauFillHours ?? 3.5;
  const tauDrain = race.lochTauDrainHours ?? 8;
  const scale = race.headRateScale ?? 4;
  const start = dayStart.getTime();
  const end = start + 24 * 3600_000;

  // Sea level over a padded window so the reservoir filter has warmed up.
  const sea = seaLevelSeries(ref, new Date(start - 16 * 3600_000), new Date(end), 10);

  // Loch level: an asymmetric first-order low-pass of the sea. It fills faster
  // than it drains (the sill restricts outflow), so the falls run OUT longer.
  // head = sea − loch.
  let loch = sea[0].height;
  const all: StreamSample[] = sea.map((s, i) => {
    if (i > 0) {
      const dtH = (s.time.getTime() - sea[i - 1].time.getTime()) / 3600_000;
      const tau = sea[i - 1].height < loch ? tauDrain : tauFill;
      loch += (dtH / tau) * (sea[i - 1].height - loch);
    }
    return { time: s.time, rate: (s.height - loch) * scale }; // + = sea above loch = flood in
  });
  const samples = all.filter((s) => s.time.getTime() >= start && s.time.getTime() <= end);

  const { slacks, peaks } = deriveEvents(samples, race.floodName, race.ebbName);
  const peakRate = samples.reduce((m, s) => Math.max(m, Math.abs(s.rate)), 0);
  return { samples, slacks, peaks, springNeapFraction: fraction, peakRate };
}

/** Slacks (zero crossings) and peaks (lobe maxima) from a signed-rate series. */
function deriveEvents(
  samples: StreamSample[],
  floodName: string,
  ebbName: string,
): { slacks: Date[]; peaks: StreamPeak[] } {
  const slacks: Date[] = [];
  const crossings: number[] = [0];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i - 1].rate;
    const b = samples[i].rate;
    if ((a <= 0 && b > 0) || (a >= 0 && b < 0)) {
      const f = a !== b ? a / (a - b) : 0;
      const t = samples[i - 1].time.getTime() + f * (samples[i].time.getTime() - samples[i - 1].time.getTime());
      slacks.push(new Date(t));
      crossings.push(i);
    }
  }
  crossings.push(samples.length - 1);

  const peaks: StreamPeak[] = [];
  for (let k = 0; k < crossings.length - 1; k++) {
    let bi = crossings[k];
    let bv = 0;
    for (let i = crossings[k]; i <= crossings[k + 1]; i++) {
      if (Math.abs(samples[i].rate) > Math.abs(bv)) {
        bv = samples[i].rate;
        bi = i;
      }
    }
    if (Math.abs(bv) > 0.3) {
      peaks.push({ time: samples[bi].time, rate: bv, dirName: bv > 0 ? floodName : ebbName });
    }
  }
  return { slacks, peaks };
}
