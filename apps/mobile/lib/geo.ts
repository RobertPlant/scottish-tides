// Nearest-station lookup for "tides near me".

import { type Station, STATIONS } from '@/lib/stations';

/** Great-circle distance in km. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** The station closest to a position, with its distance in km. */
export function nearestStation(lat: number, lon: number): { station: Station; km: number } {
  let best = STATIONS[0];
  let bestKm = Number.POSITIVE_INFINITY;
  for (const s of STATIONS) {
    const km = haversineKm(lat, lon, s.lat, s.lon);
    if (km < bestKm) {
      bestKm = km;
      best = s;
    }
  }
  return { station: best, km: bestKm };
}
