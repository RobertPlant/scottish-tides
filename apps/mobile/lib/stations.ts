// Station registry. Each entry bundles a set of fitted harmonic constituents
// (a *.json produced by the offline fitter) plus map metadata. Some stations are
// "standard ports" that predict directly; others are derived from a nearby gauge
// by a constant secondary-port shift (e.g. Oban from Tobermory).
//
// To add a station: drop its constituents JSON in assets/data, import it here,
// and append a Station. See docs/adding-a-station.md.

import brodickShift from '@/assets/data/brodick_from_millport.json';
import campbeltownShift from '@/assets/data/campbeltown_from_millport.json';
import rothesayShift from '@/assets/data/rothesay_from_millport.json';
import tarbertLochFyneShift from '@/assets/data/tarbert_loch_fyne_from_millport.json';
import ardfernShift from '@/assets/data/ardfern_from_tobermory.json';
import connelShift from '@/assets/data/connel_from_tobermory.json';
import easdaleShift from '@/assets/data/easdale_from_tobermory.json';
import aberdeenData from '@/assets/data/aberdeen.json';
import kinlochbervieData from '@/assets/data/kinlochbervie.json';
import leithData from '@/assets/data/leith.json';
import lerwickData from '@/assets/data/lerwick.json';
import mallaigShift from '@/assets/data/mallaig_from_tobermory.json';
import millportData from '@/assets/data/millport.json';
import obanShift from '@/assets/data/oban_from_tobermory.json';
import portEllenData from '@/assets/data/port_ellen.json';
import portpatrickData from '@/assets/data/portpatrick.json';
import portreeShift from '@/assets/data/portree_from_ullapool.json';
import stornowayData from '@/assets/data/stornoway.json';
import tobermoryData from '@/assets/data/tobermory.json';
import uigShift from '@/assets/data/uig_from_ullapool.json';
import ullapoolData from '@/assets/data/ullapool.json';
import wickData from '@/assets/data/wick.json';
import type { Shift, StationData } from '@/lib/tides';

export const REGION_ORDER = [
  'Clyde',
  'South-West',
  'West Coast',
  'Outer Hebrides',
  'North-West',
  'Northern Isles',
  'North-East',
  'East Coast',
] as const;

export type Region = (typeof REGION_ORDER)[number];

export interface Station {
  id: string;
  name: string;
  /** Short note under the name, e.g. how it is derived. */
  subtitle: string;
  region: Region;
  lat: number;
  lon: number;
  data: StationData;
  /** Secondary-port correction applied to predictions, if any. */
  shift?: Shift;
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
  },
  {
    id: 'rothesay',
    name: 'Rothesay',
    subtitle: 'Isle of Bute, via Millport + offset',
    region: 'Clyde',
    lat: 55.8375,
    lon: -5.0545,
    data: millportData as StationData,
    shift: rothesayShift as Shift,
  },
  {
    id: 'brodick',
    name: 'Brodick',
    subtitle: 'Isle of Arran, via Millport + offset',
    region: 'Clyde',
    lat: 55.5764,
    lon: -5.1395,
    data: millportData as StationData,
    shift: brodickShift as Shift,
  },
  {
    id: 'tarbert-loch-fyne',
    name: 'Tarbert',
    subtitle: 'Loch Fyne, via Millport + offset',
    region: 'Clyde',
    lat: 55.8645,
    lon: -5.414,
    data: millportData as StationData,
    shift: tarbertLochFyneShift as Shift,
  },
  {
    id: 'campbeltown',
    name: 'Campbeltown',
    subtitle: 'Kintyre, via Millport + offset',
    region: 'Clyde',
    lat: 55.423,
    lon: -5.604,
    data: millportData as StationData,
    shift: campbeltownShift as Shift,
  },
  {
    id: 'portpatrick',
    name: 'Portpatrick',
    subtitle: 'Galloway / North Channel',
    region: 'South-West',
    lat: 54.8423,
    lon: -5.1184,
    data: portpatrickData as StationData,
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
  },
  {
    id: 'tobermory',
    name: 'Tobermory',
    subtitle: 'Isle of Mull',
    region: 'West Coast',
    lat: 56.6228,
    lon: -6.0637,
    data: tobermoryData as StationData,
  },
  {
    id: 'port-ellen',
    name: 'Port Ellen',
    subtitle: 'Islay, very small range',
    region: 'West Coast',
    lat: 55.6275,
    lon: -6.1886,
    data: portEllenData as StationData,
  },
  {
    id: 'connel',
    name: 'Connel',
    subtitle: 'Loch Etive, via Tobermory + offset',
    region: 'West Coast',
    lat: 56.4545,
    lon: -5.388,
    data: tobermoryData as StationData,
    shift: connelShift as Shift,
  },
  {
    id: 'easdale',
    name: 'Easdale',
    subtitle: 'Isle of Seil, via Tobermory + offset',
    region: 'West Coast',
    lat: 56.293,
    lon: -5.6556,
    data: tobermoryData as StationData,
    shift: easdaleShift as Shift,
  },
  {
    id: 'ardfern',
    name: 'Ardfern',
    subtitle: 'Loch Craignish, via Tobermory + offset',
    region: 'West Coast',
    lat: 56.1826,
    lon: -5.534,
    data: tobermoryData as StationData,
    shift: ardfernShift as Shift,
  },
  {
    id: 'mallaig',
    name: 'Mallaig',
    subtitle: 'Sound of Sleat, via Tobermory + offset',
    region: 'West Coast',
    lat: 57.0058,
    lon: -5.8283,
    data: tobermoryData as StationData,
    shift: mallaigShift as Shift,
  },
  {
    id: 'portree',
    name: 'Portree',
    subtitle: 'Isle of Skye, via Ullapool + offset',
    region: 'West Coast',
    lat: 57.4128,
    lon: -6.1917,
    data: ullapoolData as StationData,
    shift: portreeShift as Shift,
  },
  {
    id: 'uig',
    name: 'Uig',
    subtitle: 'Loch Snizort, Skye, via Ullapool + offset',
    region: 'West Coast',
    lat: 57.5869,
    lon: -6.3631,
    data: ullapoolData as StationData,
    shift: uigShift as Shift,
  },
  {
    id: 'stornoway',
    name: 'Stornoway',
    subtitle: 'Isle of Lewis',
    region: 'Outer Hebrides',
    lat: 58.2073,
    lon: -6.3887,
    data: stornowayData as StationData,
  },
  {
    id: 'ullapool',
    name: 'Ullapool',
    subtitle: 'Summer Isles',
    region: 'North-West',
    lat: 57.8951,
    lon: -5.1589,
    data: ullapoolData as StationData,
  },
  {
    id: 'kinlochbervie',
    name: 'Kinlochbervie',
    subtitle: 'Sutherland NW',
    region: 'North-West',
    lat: 58.4571,
    lon: -5.0501,
    data: kinlochbervieData as StationData,
  },
  {
    id: 'lerwick',
    name: 'Lerwick',
    subtitle: 'Shetland',
    region: 'Northern Isles',
    lat: 60.1547,
    lon: -1.1454,
    data: lerwickData as StationData,
  },
  {
    id: 'wick',
    name: 'Wick',
    subtitle: 'Caithness / Pentland approaches',
    region: 'North-East',
    lat: 58.4413,
    lon: -3.0863,
    data: wickData as StationData,
  },
  {
    id: 'aberdeen',
    name: 'Aberdeen',
    subtitle: 'North-east coast',
    region: 'East Coast',
    lat: 57.1437,
    lon: -2.0797,
    data: aberdeenData as StationData,
  },
  {
    id: 'leith',
    name: 'Leith',
    subtitle: 'Edinburgh / Firth of Forth',
    region: 'East Coast',
    lat: 55.9896,
    lon: -3.1769,
    data: leithData as StationData,
  },
];

export function stationById(id: string): Station | undefined {
  return STATIONS.find(s => s.id === id);
}

/** List the stations whose name, subtitle or region contains the query, ignoring case. */
export const listMatchingStations = (stations: Station[], query: string): Station[] => {
  const needle = query.trim().toLowerCase();

  return stations.filter(station =>
    [station.name, station.subtitle, station.region].some(text => text.toLowerCase().includes(needle)),
  );
};
