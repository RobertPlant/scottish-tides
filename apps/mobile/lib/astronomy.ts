// Offline sun & moon for trip planning — sunrise/sunset (daylight window) and
// moon phase. Independent of the tide engine. Accuracy is "good enough for
// planning" (~1 min on sun times, phase to a few %), all computed on device.

const RAD = Math.PI / 180;
const J2000 = 2451545.0;
const OBLIQUITY = 23.4397; // mean obliquity of the ecliptic (deg)

function toJulian(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

function fromJulian(j: number): Date {
  return new Date((j - 2440587.5) * 86_400_000);
}

export interface SunTimes {
  sunrise: Date | null; // null in polar day/night (never in Scotland)
  sunset: Date | null;
  daylightMinutes: number;
  /** true if the sun never sets (polar day), false if it never rises. */
  alwaysUp?: boolean;
}

/**
 * Sunrise/sunset for a civil date at a location, via the standard sunrise
 * equation (NOAA). `lon` is east-negative (our station convention).
 */
export function sunTimes(date: Date, lat: number, lon: number): SunTimes {
  const lw = -lon; // formula wants west-positive longitude
  const n = Math.round(toJulian(date) - J2000 - 0.0009);
  const jStar = n + 0.0009 + lw / 360; // mean solar noon
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const Mr = M * RAD;
  const C = 1.9148 * Math.sin(Mr) + 0.02 * Math.sin(2 * Mr) + 0.0003 * Math.sin(3 * Mr);
  const lambda = ((M + C + 180 + 102.9372) % 360) * RAD;
  const jTransit = J2000 + jStar + 0.0053 * Math.sin(Mr) - 0.0069 * Math.sin(2 * lambda);
  const delta = Math.asin(Math.sin(lambda) * Math.sin(OBLIQUITY * RAD));

  const cosOmega =
    (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * Math.sin(delta)) /
    (Math.cos(lat * RAD) * Math.cos(delta));

  if (cosOmega < -1) {
    return { sunrise: null, sunset: null, daylightMinutes: 24 * 60, alwaysUp: true };
  }
  if (cosOmega > 1) {
    return { sunrise: null, sunset: null, daylightMinutes: 0, alwaysUp: false };
  }

  const omega = Math.acos(cosOmega) / RAD; // degrees
  const jRise = jTransit - omega / 360;
  const jSet = jTransit + omega / 360;
  const sunrise = fromJulian(jRise);
  const sunset = fromJulian(jSet);
  return {
    sunrise,
    sunset,
    daylightMinutes: Math.round((sunset.getTime() - sunrise.getTime()) / 60_000),
  };
}

export interface MoonInfo {
  phase: number; // 0=new, 0.5=full, [0,1)
  illumination: number; // 0..1 fraction lit
  name: string;
  emoji: string;
}

const SYNODIC = 29.530588853;
const KNOWN_NEW_MOON = 2451550.1; // 2000-01-06 18:14 UTC

const PHASE_NAMES: [string, string][] = [
  ['New moon', '🌑'],
  ['Waxing crescent', '🌒'],
  ['First quarter', '🌓'],
  ['Waxing gibbous', '🌔'],
  ['Full moon', '🌕'],
  ['Waning gibbous', '🌖'],
  ['Last quarter', '🌗'],
  ['Waning crescent', '🌘'],
];

/** Moon phase & illumination for an instant (mid-day of the civil date is fine). */
export function moonInfo(date: Date): MoonInfo {
  const days = toJulian(date) - KNOWN_NEW_MOON;
  const phase = (((days / SYNODIC) % 1) + 1) % 1;
  const illumination = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  // 8 named phases; the four cardinal ones occupy a narrow band around their point.
  const idx = Math.round(phase * 8) % 8;
  const [name, emoji] = PHASE_NAMES[idx];
  return { phase, illumination, name, emoji };
}
