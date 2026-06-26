// Astronomical arguments for harmonic tide prediction.
//
// A faithful TypeScript port of pytides2's `astro.py` (the engine behind
// ~/org/scripts/tides.py). Every formula and constant mirrors the Python so the
// two stay numerically identical — see lib/tides/*.test.ts for the parity gate.
//
// All angles are in degrees unless noted. `value` is the angle at time t;
// `speed` is its time-derivative in degrees/hour (null where unused).

export type AstroParam = { value: number; speed: number | null };
export type Astro = Record<string, AstroParam>;

const d2r = Math.PI / 180.0;
const r2d = 180.0 / Math.PI;

const mod360 = (x: number): number => ((x % 360.0) + 360.0) % 360.0;

/** Degrees from degrees/arcmin/arcsec/milli-arcsec/micro-arcsec. */
function s2d(degrees: number, arcmins = 0, arcsecs = 0, mas = 0, muas = 0): number {
  return (
    degrees +
    arcmins / 60.0 +
    arcsecs / (60.0 * 60.0) +
    mas / (60.0 * 60.0 * 1e3) +
    muas / (60.0 * 60.0 * 1e6)
  );
}

function polynomial(coefficients: number[], argument: number): number {
  let sum = 0;
  for (let i = 0; i < coefficients.length; i++) {
    sum += coefficients[i] * argument ** i;
  }
  return sum;
}

function dPolynomial(coefficients: number[], argument: number): number {
  let sum = 0;
  for (let i = 0; i < coefficients.length; i++) {
    sum += coefficients[i] * i * argument ** (i - 1);
  }
  return sum;
}

/** Julian Date from a UTC instant (pytides uses naive-UTC datetime fields). */
export function JD(t: Date): number {
  let Y = t.getUTCFullYear();
  let M = t.getUTCMonth() + 1;
  const D =
    t.getUTCDate() +
    t.getUTCHours() / 24.0 +
    t.getUTCMinutes() / (24.0 * 60.0) +
    t.getUTCSeconds() / (24.0 * 60.0 * 60.0) +
    t.getUTCMilliseconds() / (24.0 * 60.0 * 60.0 * 1e3);
  if (M <= 2) {
    Y = Y - 1;
    M = M + 12;
  }
  const A = Math.floor(Y / 100.0);
  const B = 2 - A + Math.floor(A / 4.0);
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
}

function T(t: Date): number {
  return (JD(t) - 2451545.0) / 36525;
}

// --- Polynomial coefficient tables (mirror astro.py exactly) -----------------

const terrestrialObliquityCoefficients = [
  s2d(23, 26, 21.448),
  -s2d(0, 0, 4680.93),
  -s2d(0, 0, 1.55),
  s2d(0, 0, 1999.25),
  -s2d(0, 0, 51.38),
  -s2d(0, 0, 249.67),
  -s2d(0, 0, 39.05),
  s2d(0, 0, 7.12),
  s2d(0, 0, 27.87),
  s2d(0, 0, 5.79),
  s2d(0, 0, 2.45),
].map((c, i) => c * (1e-2) ** i);

const solarPerigeeCoefficients = [
  280.46645 - 357.5291,
  36000.76932 - 35999.0503,
  0.0003032 + 0.0001559,
  0.00000048,
];

const solarLongitudeCoefficients = [280.46645, 36000.76983, 0.0003032];

const lunarInclinationCoefficients = [5.145];

// NB: in pytides the 4th element is written across two lines with no comma, so
// Python parses it as a single subtraction `1/538841 - 1/65194000`. Replicate.
const lunarLongitudeCoefficients = [
  218.3164591,
  481267.88134236,
  -0.0013268,
  1 / 538841.0 - 1 / 65194000.0,
];

const lunarNodeCoefficients = [
  125.044555,
  -1934.1361849,
  0.0020762,
  1 / 467410.0,
  -1 / 60616000.0,
];

const lunarPerigeeCoefficients = [
  83.353243,
  4069.0137111,
  -0.0103238,
  -1 / 80053.0,
  1 / 18999000.0,
];

// --- Obliquity / node geometry (I, xi, nu, nu', nu'') ------------------------

function _I(N: number, i: number, omega: number): number {
  N = d2r * N;
  i = d2r * i;
  omega = d2r * omega;
  const cosI = Math.cos(i) * Math.cos(omega) - Math.sin(i) * Math.sin(omega) * Math.cos(N);
  return r2d * Math.acos(cosI);
}

function _xi(N: number, i: number, omega: number): number {
  N = d2r * N;
  i = d2r * i;
  omega = d2r * omega;
  let e1 = (Math.cos(0.5 * (omega - i)) / Math.cos(0.5 * (omega + i))) * Math.tan(0.5 * N);
  let e2 = (Math.sin(0.5 * (omega - i)) / Math.sin(0.5 * (omega + i))) * Math.tan(0.5 * N);
  e1 = Math.atan(e1);
  e2 = Math.atan(e2);
  e1 = e1 - 0.5 * N;
  e2 = e2 - 0.5 * N;
  return -(e1 + e2) * r2d;
}

function _nu(N: number, i: number, omega: number): number {
  N = d2r * N;
  i = d2r * i;
  omega = d2r * omega;
  let e1 = (Math.cos(0.5 * (omega - i)) / Math.cos(0.5 * (omega + i))) * Math.tan(0.5 * N);
  let e2 = (Math.sin(0.5 * (omega - i)) / Math.sin(0.5 * (omega + i))) * Math.tan(0.5 * N);
  e1 = Math.atan(e1);
  e2 = Math.atan(e2);
  e1 = e1 - 0.5 * N;
  e2 = e2 - 0.5 * N;
  return (e1 - e2) * r2d;
}

function _nup(N: number, i: number, omega: number): number {
  const I = d2r * _I(N, i, omega);
  const nu = d2r * _nu(N, i, omega);
  return r2d * Math.atan((Math.sin(2 * I) * Math.sin(nu)) / (Math.sin(2 * I) * Math.cos(nu) + 0.3347));
}

function _nupp(N: number, i: number, omega: number): number {
  const I = d2r * _I(N, i, omega);
  const nu = d2r * _nu(N, i, omega);
  const tan2nupp = (Math.sin(I) ** 2 * Math.sin(2 * nu)) / (Math.sin(I) ** 2 * Math.cos(2 * nu) + 0.0727);
  return r2d * 0.5 * Math.atan(tan2nupp);
}

const dT_dHour = 1 / (24 * 365.25 * 100);

/** Compute all astronomical parameters at instant `t`. */
export function astro(t: Date): Astro {
  const a: Astro = {};
  const tt = T(t);

  const polynomials: Record<string, number[]> = {
    s: lunarLongitudeCoefficients,
    h: solarLongitudeCoefficients,
    p: lunarPerigeeCoefficients,
    N: lunarNodeCoefficients,
    pp: solarPerigeeCoefficients,
    '90': [90.0],
    omega: terrestrialObliquityCoefficients,
    i: lunarInclinationCoefficients,
  };

  for (const name of Object.keys(polynomials)) {
    const coefficients = polynomials[name];
    a[name] = {
      value: mod360(polynomial(coefficients, tt)),
      speed: dPolynomial(coefficients, tt) * dT_dHour,
    };
  }

  const N = a.N.value;
  const iVal = a.i.value;
  const omega = a.omega.value;
  const geometry: Record<string, (n: number, i: number, o: number) => number> = {
    I: _I,
    xi: _xi,
    nu: _nu,
    nup: _nup,
    nupp: _nupp,
  };
  for (const name of Object.keys(geometry)) {
    a[name] = { value: mod360(geometry[name](N, iVal, omega)), speed: null };
  }

  const jd = JD(t);
  const hour: AstroParam = { value: (jd - Math.floor(jd)) * 360.0, speed: 15.0 };
  a['T+h-s'] = {
    value: hour.value + a.h.value - a.s.value,
    speed: (hour.speed ?? 0) + (a.h.speed ?? 0) - (a.s.speed ?? 0),
  };
  a.P = { value: mod360(a.p.value - a.xi.value), speed: null };

  return a;
}

export { d2r, r2d, mod360 };
