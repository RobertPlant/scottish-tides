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
- **Tide curve** — continuous height-vs-time for the day with a "now" marker.
- **Now / next** — at a glance: rising or falling, and the next turn.
- **Station map** — pick a port around the Scottish coast.

All heights are referenced to **Admiralty Chart Datum**, so they match printed
charts and tide tables.

## What it is NOT

⚠️ These are **water levels (height), not tidal streams.** Stream-dominated
places — the **Pentland Firth**, **Falls of Lora**, **Kylerhea**, the **Grey
Dogs** — need a tidal stream atlas, not this. Never plan a race transit from
these height tables alone.

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
