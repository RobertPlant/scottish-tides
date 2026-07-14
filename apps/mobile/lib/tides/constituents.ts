// Tidal constituents. Port of pytides2 constituent.py.
//
// Each constituent carries Doodson coefficients (derived from an "extended
// Doodson" / XDO string) plus its nodal-correction functions f and u. The
// equilibrium argument V and angular speed are dot products of the coefficients
// with the astronomical values / speeds. Compound constituents are linear
// combinations of base members.

import type { Astro } from './astro';
import * as nc from './nodal';

const XDO_INT: Record<string, number> = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  I: 9,
  J: 10,
  K: 11,
  L: 12,
  M: 13,
  N: 14,
  O: 15,
  P: 16,
  Q: 17,
  R: -8,
  S: -7,
  T: -6,
  U: -5,
  V: -4,
  W: -3,
  X: -2,
  Y: -1,
  Z: 0,
};

const LETTERS = /[A-Za-z]/;

function xdoToCoefficients(xdo: string): number[] {
  const out: number[] = [];
  for (const ch of xdo) {
    if (LETTERS.test(ch)) {
      out.push(XDO_INT[ch.toUpperCase()]);
    }
  }
  return out;
}

// The seven astronomical arguments a constituent's coefficients multiply, in
// pytides order: [T+h-s, s, h, p, N, pp, 90].
function astroValues(a: Astro): number[] {
  return [a['T+h-s'].value, a.s.value, a.h.value, a.p.value, a.N.value, a.pp.value, a['90'].value];
}

function astroSpeeds(a: Astro): number[] {
  return [
    a['T+h-s'].speed ?? 0,
    a.s.speed ?? 0,
    a.h.speed ?? 0,
    a.p.speed ?? 0,
    a.N.speed ?? 0,
    a.pp.speed ?? 0,
    a['90'].speed ?? 0,
  ];
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i];
  }
  return s;
}

export interface Constituent {
  name: string;
  coefficients: number[];
  V(a: Astro): number;
  speed(a: Astro): number;
  u(a: Astro): number;
  f(a: Astro): number;
}

class BaseConstituent implements Constituent {
  name: string;
  coefficients: number[];
  uFn: (a: Astro) => number;
  fFn: (a: Astro) => number;

  constructor(
    name: string,
    xdo: string,
    uFn: (a: Astro) => number = nc.u_zero,
    fFn: (a: Astro) => number = nc.f_unity,
  ) {
    this.name = name;
    this.coefficients = xdoToCoefficients(xdo);
    this.uFn = uFn;
    this.fFn = fFn;
  }

  V(a: Astro): number {
    return dot(this.coefficients, astroValues(a));
  }
  speed(a: Astro): number {
    return dot(this.coefficients, astroSpeeds(a));
  }
  u(a: Astro): number {
    return this.uFn(a);
  }
  f(a: Astro): number {
    return this.fFn(a);
  }
}

class CompoundConstituent implements Constituent {
  name: string;
  members: [Constituent, number][];
  coefficients: number[];

  constructor(name: string, members: [Constituent, number][]) {
    this.name = name;
    this.members = members;
    // coefficients = Σ member.coefficients * n
    const len = members[0][0].coefficients.length;
    this.coefficients = new Array(len).fill(0);
    for (const [c, n] of members) {
      for (let i = 0; i < len; i++) {
        this.coefficients[i] += c.coefficients[i] * n;
      }
    }
  }

  V(a: Astro): number {
    return this.members.reduce((acc, [c, n]) => acc + n * c.V(a), 0);
  }
  speed(a: Astro): number {
    return this.members.reduce((acc, [c, n]) => acc + n * c.speed(a), 0);
  }
  u(a: Astro): number {
    return this.members.reduce((acc, [c, n]) => acc + n * c.u(a), 0);
  }
  f(a: Astro): number {
    return this.members.reduce((acc, [c, n]) => acc * c.f(a) ** Math.abs(n), 1);
  }
}

// --- Base constituents -------------------------------------------------------

const _Z0 = new BaseConstituent('Z0', 'Z ZZZ ZZZ', nc.u_zero, nc.f_unity);
const _Sa = new BaseConstituent('Sa', 'Z ZAZ ZZZ', nc.u_zero, nc.f_unity);
const _Ssa = new BaseConstituent('Ssa', 'Z ZBZ ZZZ', nc.u_zero, nc.f_unity);
const _Mm = new BaseConstituent('Mm', 'Z AZY ZZZ', nc.u_zero, nc.f_Mm);
const _Mf = new BaseConstituent('Mf', 'Z BZZ ZZZ', nc.u_Mf, nc.f_Mf);

const _Q1 = new BaseConstituent('Q1', 'A XZA ZZA', nc.u_O1, nc.f_O1);
const _O1 = new BaseConstituent('O1', 'A YZZ ZZA', nc.u_O1, nc.f_O1);
const _K1 = new BaseConstituent('K1', 'A AZZ ZZY', nc.u_K1, nc.f_K1);
const _J1 = new BaseConstituent('J1', 'A BZY ZZY', nc.u_J1, nc.f_J1);

const _M1 = new BaseConstituent('M1', 'A ZZZ ZZA', nc.u_M1, nc.f_M1);
const _P1 = new BaseConstituent('P1', 'A AXZ ZZA', nc.u_zero, nc.f_unity);
const _S1 = new BaseConstituent('S1', 'A AYZ ZZZ', nc.u_zero, nc.f_unity);
const _OO1 = new BaseConstituent('OO1', 'A CZZ ZZY', nc.u_OO1, nc.f_OO1);

const _2N2 = new BaseConstituent('2N2', 'B XZB ZZZ', nc.u_M2, nc.f_M2);
const _N2 = new BaseConstituent('N2', 'B YZA ZZZ', nc.u_M2, nc.f_M2);
const _nu2 = new BaseConstituent('nu2', 'B YBY ZZZ', nc.u_M2, nc.f_M2);
const _M2 = new BaseConstituent('M2', 'B ZZZ ZZZ', nc.u_M2, nc.f_M2);
const _lambda2 = new BaseConstituent('lambda2', 'B AXA ZZB', nc.u_M2, nc.f_M2);
const _L2 = new BaseConstituent('L2', 'B AZY ZZB', nc.u_L2, nc.f_L2);
const _T2 = new BaseConstituent('T2', 'B BWZ ZAZ', nc.u_zero, nc.f_unity);
const _S2 = new BaseConstituent('S2', 'B BXZ ZZZ', nc.u_zero, nc.f_unity);
const _R2 = new BaseConstituent('R2', 'B BYZ ZYB', nc.u_zero, nc.f_unity);
const _K2 = new BaseConstituent('K2', 'B BZZ ZZZ', nc.u_K2, nc.f_K2);

const _M3 = new BaseConstituent(
  'M3',
  'C ZZZ ZZZ',
  (a) => nc.u_Modd(a, 3),
  (a) => nc.f_Modd(a, 3),
);

// --- Compound constituents ---------------------------------------------------

const _MSF = new CompoundConstituent('MSF', [
  [_S2, 1],
  [_M2, -1],
]);
const _2Q1 = new CompoundConstituent('2Q1', [
  [_N2, 1],
  [_J1, -1],
]);
const _rho1 = new CompoundConstituent('rho1', [
  [_nu2, 1],
  [_K1, -1],
]);
const _mu2 = new CompoundConstituent('mu2', [
  [_M2, 2],
  [_S2, -1],
]);
const _2SM2 = new CompoundConstituent('2SM2', [
  [_S2, 2],
  [_M2, -1],
]);
const _2MK3 = new CompoundConstituent('2MK3', [
  [_M2, 1],
  [_O1, 1],
]);
const _MK3 = new CompoundConstituent('MK3', [
  [_M2, 1],
  [_K1, 1],
]);
const _MN4 = new CompoundConstituent('MN4', [
  [_M2, 1],
  [_N2, 1],
]);
const _M4 = new CompoundConstituent('M4', [[_M2, 2]]);
const _MS4 = new CompoundConstituent('MS4', [
  [_M2, 1],
  [_S2, 1],
]);
const _S4 = new CompoundConstituent('S4', [[_S2, 2]]);
const _M6 = new CompoundConstituent('M6', [[_M2, 3]]);
const _S6 = new CompoundConstituent('S6', [[_S2, 3]]);
const _M8 = new CompoundConstituent('M8', [[_M2, 4]]);

export const noaa: Constituent[] = [
  _M2,
  _S2,
  _N2,
  _K1,
  _M4,
  _O1,
  _M6,
  _MK3,
  _S4,
  _MN4,
  _nu2,
  _S6,
  _mu2,
  _2N2,
  _OO1,
  _lambda2,
  _S1,
  _M1,
  _J1,
  _Mm,
  _Ssa,
  _Sa,
  _MSF,
  _Mf,
  _rho1,
  _Q1,
  _T2,
  _R2,
  _2Q1,
  _P1,
  _2SM2,
  _M3,
  _L2,
  _2MK3,
  _K2,
  _M8,
  _MS4,
];

export const Z0 = _Z0;

/** name -> constituent, including Z0 (the datum mean). */
export const NAME2CONST: Record<string, Constituent> = (() => {
  const m: Record<string, Constituent> = {};
  for (const c of noaa) {
    m[c.name] = c;
  }
  m.Z0 = _Z0;
  return m;
})();
