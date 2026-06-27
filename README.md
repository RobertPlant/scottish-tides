# Scottish Tides

Offline tide predictions for Scotland — a website and mobile app (iOS / Android /
web) built with [Expo](https://expo.dev). **No backend, no paywall, no network
required to compute a tide.**

Most tide websites charge to look at future dates. They don't have to: tides are
deterministic. The water level at a place is the sum of ~30–40 sinusoidal
*harmonic constituents* (M2, S2, K1, O1, …), each with a fixed amplitude and
phase for that location. Fit those constituents once from observed water levels
and you can predict any date, forwards or backwards, forever — on-device, offline.

This app ships the fitted constituents for a set of Scottish ports and evaluates
them in the browser / on the phone. The only thing that isn't free is the
*observations*, and UK gauge data is open (British Oceanographic Data Centre).

## What it does

- **High / low water** times and heights for any date at each station.
- **Tide curve** — continuous height-vs-time for the day; tap to read the level
  at any moment.
- **Now / next** — at a glance: rising or falling, and the next turn.
- **Spring/neap + 7-day overview** — the day's range and a week ahead.
- **Water-level windows** — when the water is above/below a chosen height
  (slipways, drying rocks, causeways).
- **Sun & moon** — daylight window and moon phase for the day.
- **Station map** — a real coastline; pick a port around Scotland.
- **Tidal streams (estimates)** — slack times and a flood/ebb curve for the
  famous races (Pentland Firth, Corryvreckan…), modelled from the tide + a
  published peak rate. A planning aid only — see the warning below.
- **Installable & offline** — add to your home screen; after one visit it works
  with no signal (a service worker caches everything). Built for the coast.

All heights are referenced to **Admiralty Chart Datum**, so they match printed
charts and tide tables.

## What it is NOT

⚠️ The station predictions are **water levels (height), not tidal streams.**

The **Streams** section gives *estimated* slack times and rates for the famous
races (Pentland Firth, Corryvreckan, Falls of Lora…), but it is a **simplified
model** — slack timing and direction are approximate and the peak rates are
*published* figures, not an Admiralty stream atlas. **Verify against the pilot
and the tidal stream atlas before committing.** These races (Corryvreckan, the
Pentland Firth) can kill; this app is a planning aid, never a navigation source.

Predictions are *astronomical* only: they do not include weather (surge), so a
deep low or a strong onshore gale can shift real levels by half a metre or more.

## How the predictions are made

The constituents are fitted offline by the harmonic-analysis pipeline in
[`tools/`](tools/) (a thin wrapper around the same maths used by
`scripts/tides.py`). Each station is a small JSON file of `{name, amplitude,
phase}` constituents plus its datum and provenance. See
[`docs/adding-a-station.md`](docs/adding-a-station.md).

The on-device predictor is a faithful TypeScript port of that engine, validated
against the Python reference to < 2 min / < 0.03 m (see
`apps/mobile/lib/tides/*.test.ts`).

## Develop

The repo uses [devenv](https://devenv.sh) (Nix) for a reproducible toolchain
(Node, Biome, Playwright browsers). With `direnv` the environment loads on `cd`.

```sh
cd apps/mobile
npm install
npm run web        # or: npm run ios / npm run android
npm run test:engine   # validate the TS engine against the Python reference
```

Formatting / linting is [Biome](https://biomejs.dev) from the repo root:

```sh
npm run check
```

## Licence

[GNU General Public License v3.0](LICENSE) (GPL-3.0-only). If you distribute a
modified version, you must pass on the same freedoms and make your source
available under the GPL.

Tide-gauge observations are © British Oceanographic Data Centre / contributors
under the Open Government Licence; only the *derived constituents* are
redistributed here.
