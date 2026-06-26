// Station registry. Each entry bundles a set of fitted harmonic constituents
// (a *.json produced by the offline fitter) plus map metadata. Some stations are
// "standard ports" that predict directly; others are derived from a nearby gauge
// by a constant secondary-port shift (e.g. Oban from Tobermory).
//
// To add a station: drop its constituents JSON in assets/data, import it here,
// and append a Station. See docs/adding-a-station.md.

import aberdeenData from '@/assets/data/aberdeen.json';
import kinlochbervieData from '@/assets/data/kinlochbervie.json';
import leithData from '@/assets/data/leith.json';
import lerwickData from '@/assets/data/lerwick.json';
import millportData from '@/assets/data/millport.json';
import obanShift from '@/assets/data/oban_from_tobermory.json';
import portEllenData from '@/assets/data/port_ellen.json';
import portpatrickData from '@/assets/data/portpatrick.json';
import stornowayData from '@/assets/data/stornoway.json';
import tobermoryData from '@/assets/data/tobermory.json';
import ullapoolData from '@/assets/data/ullapool.json';
import wickData from '@/assets/data/wick.json';
import type { Shift, StationData } from '@/lib/tides';

export type Region =
  | 'Clyde'
  | 'South-West'
  | 'West Coast'
  | 'Outer Hebrides'
  | 'North-West'
  | 'Northern Isles'
  | 'North-East'
  | 'East Coast';

export interface Station {
  id: string;
  name: string;
  /** Short note under the name, e.g. how it is derived. */
  subtitle?: string;
  region: Region;
  lat: number;
  lon: number;
  data: StationData;
  /** Secondary-port correction applied to predictions, if any. */
  shift?: Shift;
  /** True for ports with their own gauge (no shift). */
  standardPort: boolean;
}

export const STATIONS: Station[] = [
  {
    id: 'millport',
    name: 'Millport',
    subtitle: 'Great Cumbrae, Firth of Clyde',
    region: 'Clyde',
    lat: 55.7497,
    lon: -4.9064,
    data: millportData as StationData,
    standardPort: true,
  },
  {
    id: 'portpatrick',
    name: 'Portpatrick',
    subtitle: 'Galloway / North Channel',
    region: 'South-West',
    lat: 54.8423,
    lon: -5.1184,
    data: portpatrickData as StationData,
    standardPort: true,
  },
  {
    id: 'oban',
    name: 'Oban',
    subtitle: 'via Tobermory + Admiralty offset',
    region: 'West Coast',
    lat: 56.4154,
    lon: -5.4715,
    data: tobermoryData as StationData,
    shift: obanShift as Shift,
    standardPort: false,
  },
  {
    id: 'tobermory',
    name: 'Tobermory',
    subtitle: 'Isle of Mull',
    region: 'West Coast',
    lat: 56.6228,
    lon: -6.0637,
    data: tobermoryData as StationData,
    standardPort: true,
  },
  {
    id: 'port-ellen',
    name: 'Port Ellen',
    subtitle: 'Islay — very small range',
    region: 'West Coast',
    lat: 55.6275,
    lon: -6.1886,
    data: portEllenData as StationData,
    standardPort: true,
  },
  {
    id: 'stornoway',
    name: 'Stornoway',
    subtitle: 'Isle of Lewis',
    region: 'Outer Hebrides',
    lat: 58.2073,
    lon: -6.3887,
    data: stornowayData as StationData,
    standardPort: true,
  },
  {
    id: 'ullapool',
    name: 'Ullapool',
    subtitle: 'Summer Isles',
    region: 'North-West',
    lat: 57.8951,
    lon: -5.1589,
    data: ullapoolData as StationData,
    standardPort: true,
  },
  {
    id: 'kinlochbervie',
    name: 'Kinlochbervie',
    subtitle: 'Sutherland NW',
    region: 'North-West',
    lat: 58.4571,
    lon: -5.0501,
    data: kinlochbervieData as StationData,
    standardPort: true,
  },
  {
    id: 'lerwick',
    name: 'Lerwick',
    subtitle: 'Shetland',
    region: 'Northern Isles',
    lat: 60.1547,
    lon: -1.1454,
    data: lerwickData as StationData,
    standardPort: true,
  },
  {
    id: 'wick',
    name: 'Wick',
    subtitle: 'Caithness / Pentland approaches',
    region: 'North-East',
    lat: 58.4413,
    lon: -3.0863,
    data: wickData as StationData,
    standardPort: true,
  },
  {
    id: 'aberdeen',
    name: 'Aberdeen',
    subtitle: 'North-east coast',
    region: 'East Coast',
    lat: 57.1437,
    lon: -2.0797,
    data: aberdeenData as StationData,
    standardPort: true,
  },
  {
    id: 'leith',
    name: 'Leith',
    subtitle: 'Edinburgh / Firth of Forth',
    region: 'East Coast',
    lat: 55.9896,
    lon: -3.1769,
    data: leithData as StationData,
    standardPort: true,
  },
];

export function stationById(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

export const REGION_ORDER: Region[] = [
  'Clyde',
  'South-West',
  'West Coast',
  'Outer Hebrides',
  'North-West',
  'Northern Isles',
  'North-East',
  'East Coast',
];
