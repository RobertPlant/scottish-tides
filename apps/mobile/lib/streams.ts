// Tidal STREAMS for the well-known races - an estimate, not an atlas.
//
// IMPORTANT: this is a planning aid, NOT a tidal stream atlas. The model is
// deliberately simple and uses *published* peak rates (common knowledge, not
// Admiralty's copyrighted tables):
//   - a race goes slack near the reference port's HW/LW (± an offset),
//   - the rate follows a sinusoid between slacks (the "50/90" idea),
//   - the peak scales between the race's neap and spring figures by the day's
//     spring/neap fraction (from the tide engine).
// Slack timing and direction are approximate - verify against the pilot/atlas.
// These races (Corryvreckan, Pentland Firth) can kill.

import { ukEndOfDay } from '@/lib/datetime';
import { type Station, stationById } from '@/lib/stations';
import { classifyDay } from '@/lib/tide-day';
import { predictExtrema } from '@/lib/tides';

/** A strait that goes slack near the reference port's HW and LW. */
export interface Race {
  id: string;
  name: string;
  area: string;
  lat: number;
  lon: number;
  /** Bundled station whose tide drives the streams. */
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
    area: 'Caithness to Orkney',
    lat: 58.72,
    lon: -3.15,
    referenceStationId: 'aberdeen',
    slackAtHwOffsetMin: -65,
    slackAtLwOffsetMin: -72,
    floodFromLwToHw: false,
    floodName: 'W-going',
    ebbName: 'E-going',
    springPeakKn: 12,
    neapPeakKn: 6,
    warning:
      'One of the most dangerous tidal passages in Britain. Overfalls (the Merry Men of Mey, Swelkie) build huge seas against wind. Transit only at slack with a firm escape plan.',
    source:
      'Slack ≈ HW Aberdeen −1:05 (W-going begins) / +5:00 (E-going begins), from published figures; peak ~12 kn springs.',
  },
  {
    id: 'corryvreckan',
    name: 'Gulf of Corryvreckan',
    area: 'Jura to Scarba',
    lat: 56.15,
    lon: -5.71,
    referenceStationId: 'oban',
    slackAtHwOffsetMin: -140,
    slackAtLwOffsetMin: -127,
    floodFromLwToHw: true,
    floodName: 'W-going',
    ebbName: 'E-going',
    springPeakKn: 8.5,
    neapPeakKn: 4,
    warning:
      'The whirlpool: standing waves and the famous overfall on the west-going stream against swell. Slack window is short. Expert only.',
    source:
      'Slack ≈ HW Oban +4:00 / −2:30; W-going begins HW +4:10 (8.5 kn), E-going HW −2:10. From published figures.',
  },
  {
    id: 'grey-dogs',
    name: "Grey Dogs (Bealach a' Choin Ghlais)",
    area: 'Scarba to Lunga',
    lat: 56.18,
    lon: -5.67,
    referenceStationId: 'oban',
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
    slackAtHwOffsetMin: 130,
    slackAtLwOffsetMin: 170,
    floodFromLwToHw: true,
    floodName: 'In-flowing (flood)',
    ebbName: 'Out-flowing (the falls)',
    springPeakKn: 7,
    neapPeakKn: 2,
    warning:
      'A tidal rapid over a rock ledge: the falls run OUT on the ebb once the falling sea drops below Loch Etive, then IN on the flood. Strongly range-dependent: negligible on small neaps, violent on big springs.',
    source:
      "Out-flow begins HW Oban +2:10, in-flow LW Oban +2:50: the fixed offsets fallsoflora.info puts on XTide's Oban (every turn in its 2026 table). Rate magnitude indicative.",
  },
  {
    id: 'dorus-mor',
    name: 'Dorus Mòr',
    area: 'Craignish, near Crinan',
    lat: 56.11,
    lon: -5.61,
    referenceStationId: 'oban',
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
    area: 'Islay to Jura',
    lat: 55.86,
    lon: -6.1,
    referenceStationId: 'oban',
    slackAtHwOffsetMin: -40,
    slackAtLwOffsetMin: -42,
    floodFromLwToHw: true,
    floodName: 'N-going (flood)',
    ebbName: 'S-going (ebb)',
    springPeakKn: 5,
    neapPeakKn: 2.5,
    warning: 'A steady, strong tidal river. Time a transit with the stream, not against.',
    source: 'Slack ≈ HW Oban −0:40 / +5:30 (Rhinns-of-Islay figures, approximate); peak ~5 kn springs.',
  },
  {
    id: 'cuan-sound',
    name: 'Cuan Sound',
    area: 'Seil to Luing',
    lat: 56.267,
    lon: -5.629,
    referenceStationId: 'oban',
    slackAtHwOffsetMin: -90,
    slackAtLwOffsetMin: -100,
    floodFromLwToHw: true,
    floodName: 'W-going (N stream)',
    ebbName: 'E-going (S stream)',
    springPeakKn: 7,
    neapPeakKn: 3.5,
    warning:
      'Narrow and dog-legged, with the Cleit rock mid-channel and only a very brief slack at springs; it runs at six knots within half an hour of slack. Turns with the wind and pressure as well as the tide.',
    source:
      'N-going (sets W) begins ≈ HW Oban +4:30, S-going (sets E) ≈ HW −1:30, 7 kn springs (Wikipedia, from an old gazetteer); forum reports put the turn 1 to 2 h before HW/LW Oban. Neap rate a guess.',
  },
  {
    id: 'sound-of-luing',
    name: 'Sound of Luing',
    area: 'Luing to Scarba and Fladda',
    lat: 56.23,
    lon: -5.67,
    referenceStationId: 'oban',
    slackAtHwOffsetMin: -105,
    slackAtLwOffsetMin: -100,
    floodFromLwToHw: true,
    floodName: 'N-going (flood)',
    ebbName: 'S-going (ebb)',
    springPeakKn: 7,
    neapPeakKn: 5,
    warning:
      'Fastest at the north end around Fladda, with overfalls off the islets against wind. The tidal atlas shows ~2 kn mid-sound, far below what boats meet in the narrows.',
    source:
      'N-going begins ≈ HW Oban +4:30, S-going ≈ HW Oban −1:45 (Ardfern Yacht Centre, after the CCC directions; later at neaps). 7 kn springs, 5 kn neaps around Fladda (CCC, as quoted on YBW).',
  },
  {
    id: 'kyle-rhea',
    name: 'Kyle Rhea',
    area: 'Glenelg to Skye',
    lat: 57.235,
    lon: -5.66,
    referenceStationId: 'ullapool',
    slackAtHwOffsetMin: 0,
    slackAtLwOffsetMin: 0,
    floodFromLwToHw: true,
    floodName: 'N-going (flood)',
    ebbName: 'S-going (ebb)',
    springPeakKn: 8,
    neapPeakKn: 5,
    warning:
      'Strong eddies and overfalls in the narrows, worst at the north end against a northerly. Too fast to punch on springs: go with it.',
    source:
      'S-going from ≈ HW Ullapool, N-going from ≈ HW +6 (visitmyharbour); over 8 kn springs and 5 kn on neap floods (Admiralty chart 2541). Sources disagree on the N-going start: check the atlas.',
  },
];

export function raceById(id: string): Race | undefined {
  return RACES.find(r => r.id === id);
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

/** The bundled station whose tide drives a race. */
export function getReferenceStation(race: Race): Station {
  const ref = stationById(race.referenceStationId);
  if (!ref) {
    throw new Error(`race ${race.id} has no station ${race.referenceStationId}`);
  }

  return ref;
}

/** Stream estimate for a race over the UK civil day starting at `dayStart`. */
export function predictStreamDay(race: Race, dayStart: Date): StreamDay {
  const ref = getReferenceStation(race);
  const { fraction } = classifyDay(ref, dayStart).cls;

  const from = new Date(dayStart.getTime() - 9 * 3600_000);
  const to = new Date(dayStart.getTime() + 33 * 3600_000);
  const events = predictExtrema(ref.data, from, to, ref.shift);
  const peakRate = race.neapPeakKn + fraction * (race.springPeakKn - race.neapPeakKn);
  const { slackAtHwOffsetMin: hwOff, slackAtLwOffsetMin: lwOff, floodFromLwToHw } = race;

  const slacks = events
    .map(e => ({
      t: e.time.getTime() + (e.type === 'high' ? hwOff : lwOff) * 60_000,
      afterLow: e.type === 'low',
    }))
    // sort, not toSorted - Hermes doesn't have it
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
  const end = ukEndOfDay(dayStart).getTime();
  const samples: StreamSample[] = [];
  for (let t = start; t <= end; t += 15 * 60_000) {
    samples.push({ time: new Date(t), rate: rateAt(t) });
  }
  const daySlacks = slacks.filter(s => s.t >= start && s.t <= end).map(s => new Date(s.t));
  const peaks: StreamPeak[] = segments
    .map(seg => ({
      time: new Date((seg.s0 + seg.s1) / 2),
      rate: seg.flood ? peakRate : -peakRate,
      dirName: seg.flood ? race.floodName : race.ebbName,
    }))
    .filter(p => p.time.getTime() >= start && p.time.getTime() <= end);

  return { samples, slacks: daySlacks, peaks, springNeapFraction: fraction, peakRate };
}
