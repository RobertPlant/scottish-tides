// Nodal corrections f (amplitude factor) and u (phase, degrees).
// Faithful port of pytides2 nodal_corrections.py. Each function reads degree
// values out of an Astro record and returns either a unitless factor (f_*) or a
// phase correction in degrees (u_*).

import type { Astro } from './astro';
import { d2r, r2d } from './astro';

const sin = Math.sin;
const cos = Math.cos;
const tan = Math.tan;
const atan = Math.atan;

// --- f: amplitude (node) factors ---------------------------------------------

export function f_unity(): number {
  return 1.0;
}

export function f_Mm(a: Astro): number {
  const omega = d2r * a.omega.value;
  const i = d2r * a.i.value;
  const I = d2r * a.I.value;
  const mean = (2 / 3.0 - sin(omega) ** 2) * (1 - (3 / 2.0) * sin(i) ** 2);
  return (2 / 3.0 - sin(I) ** 2) / mean;
}

export function f_Mf(a: Astro): number {
  const omega = d2r * a.omega.value;
  const i = d2r * a.i.value;
  const I = d2r * a.I.value;
  const mean = sin(omega) ** 2 * cos(0.5 * i) ** 4;
  return sin(I) ** 2 / mean;
}

export function f_O1(a: Astro): number {
  const omega = d2r * a.omega.value;
  const i = d2r * a.i.value;
  const I = d2r * a.I.value;
  const mean = sin(omega) * cos(0.5 * omega) ** 2 * cos(0.5 * i) ** 4;
  return (sin(I) * cos(0.5 * I) ** 2) / mean;
}

export function f_J1(a: Astro): number {
  const omega = d2r * a.omega.value;
  const i = d2r * a.i.value;
  const I = d2r * a.I.value;
  const mean = sin(2 * omega) * (1 - (3 / 2.0) * sin(i) ** 2);
  return sin(2 * I) / mean;
}

export function f_OO1(a: Astro): number {
  const omega = d2r * a.omega.value;
  const i = d2r * a.i.value;
  const I = d2r * a.I.value;
  const mean = sin(omega) * sin(0.5 * omega) ** 2 * cos(0.5 * i) ** 4;
  return (sin(I) * sin(0.5 * I) ** 2) / mean;
}

export function f_M2(a: Astro): number {
  const omega = d2r * a.omega.value;
  const i = d2r * a.i.value;
  const I = d2r * a.I.value;
  const mean = cos(0.5 * omega) ** 4 * cos(0.5 * i) ** 4;
  return cos(0.5 * I) ** 4 / mean;
}

export function f_K1(a: Astro): number {
  const omega = d2r * a.omega.value;
  const i = d2r * a.i.value;
  const I = d2r * a.I.value;
  const nu = d2r * a.nu.value;
  const sin2Icosnu_mean = sin(2 * omega) * (1 - (3 / 2.0) * sin(i) ** 2);
  const mean = 0.5023 * sin2Icosnu_mean + 0.1681;
  return (0.2523 * sin(2 * I) ** 2 + 0.1689 * sin(2 * I) * cos(nu) + 0.0283) ** 0.5 / mean;
}

export function f_L2(a: Astro): number {
  const P = d2r * a.P.value;
  const I = d2r * a.I.value;
  const R_a_inv = (1 - 12 * tan(0.5 * I) ** 2 * cos(2 * P) + 36 * tan(0.5 * I) ** 4) ** 0.5;
  return f_M2(a) * R_a_inv;
}

export function f_K2(a: Astro): number {
  const omega = d2r * a.omega.value;
  const i = d2r * a.i.value;
  const I = d2r * a.I.value;
  const nu = d2r * a.nu.value;
  const sinsqIcos2nu_mean = sin(omega) ** 2 * (1 - (3 / 2.0) * sin(i) ** 2);
  const mean = 0.5023 * sinsqIcos2nu_mean + 0.0365;
  return (0.2533 * sin(I) ** 4 + 0.0367 * sin(I) ** 2 * cos(2 * nu) + 0.0013) ** 0.5 / mean;
}

export function f_M1(a: Astro): number {
  const P = d2r * a.P.value;
  const I = d2r * a.I.value;
  const Q_a_inv =
    (0.25 +
      1.5 * cos(I) * cos(2 * P) * cos(0.5 * I) ** -0.5 +
      2.25 * cos(I) ** 2 * cos(0.5 * I) ** -4) **
    0.5;
  return f_O1(a) * Q_a_inv;
}

export function f_Modd(a: Astro, n: number): number {
  return f_M2(a) ** (n / 2.0);
}

// --- u: phase corrections (degrees) ------------------------------------------

export function u_zero(): number {
  return 0.0;
}

export function u_Mf(a: Astro): number {
  return -2.0 * a.xi.value;
}

export function u_O1(a: Astro): number {
  return 2.0 * a.xi.value - a.nu.value;
}

export function u_J1(a: Astro): number {
  return -a.nu.value;
}

export function u_OO1(a: Astro): number {
  return -2.0 * a.xi.value - a.nu.value;
}

export function u_M2(a: Astro): number {
  return 2.0 * a.xi.value - 2.0 * a.nu.value;
}

export function u_K1(a: Astro): number {
  return -a.nup.value;
}

export function u_L2(a: Astro): number {
  const I = d2r * a.I.value;
  const P = d2r * a.P.value;
  const R = r2d * atan(sin(2 * P) / ((1 / 6.0) * tan(0.5 * I) ** -2 - cos(2 * P)));
  return 2.0 * a.xi.value - 2.0 * a.nu.value - R;
}

export function u_K2(a: Astro): number {
  return -2.0 * a.nupp.value;
}

export function u_M1(a: Astro): number {
  const I = d2r * a.I.value;
  const P = d2r * a.P.value;
  const Q = r2d * atan(((5 * cos(I) - 1) / (7 * cos(I) + 1)) * tan(P));
  return a.xi.value - a.nu.value + Q;
}

export function u_Modd(a: Astro, n: number): number {
  return (n / 2.0) * u_M2(a);
}
