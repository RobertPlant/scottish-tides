// Station registry. Each entry bundles a set of fitted harmonic constituents
// (a *.json produced by the offline fitter) plus map metadata. Some stations are
// "standard ports" that predict directly; others are derived from a nearby gauge
// by a constant secondary-port shift (e.g. Oban from Tobermory).
//
// To add a station: drop its constituents JSON in assets/data, import it here,
// and append a Station. See docs/adding-a-station.md.

import obanShift from '@/assets/data/oban_from_tobermory.json';
import leithData from '@/assets/data/leith.json';
import tobermoryData from '@/assets/data/tobermory.json';
import ullapoolData from '@/assets/data/ullapool.json';
import type { Shift, StationData } from '@/lib/tides';

export type Region = 'West Coast' | 'East Coast' | 'North-West' | 'North-East';

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
    id: 'leith',
    name: 'Leith',
    subtitle: 'Edinburgh / Firth of Forth',
    region: 'East Coast',
    lat: 55.9896,
    lon: -3.1769,
    data: leithData as StationData,
    standardPort: true,
  },
  {
    id: 'ullapool',
    name: 'Ullapool',
    subtitle: 'Summer Isles / NW',
    region: 'North-West',
    lat: 57.8951,
    lon: -5.1589,
    data: ullapoolData as StationData,
    standardPort: true,
  },
];

export function stationById(id: string): Station | undefined {
  return STATIONS.find((s) => s.id === id);
}

export const REGION_ORDER: Region[] = ['West Coast', 'North-West', 'North-East', 'East Coast'];
