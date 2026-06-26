# Adding a station

A station is a small JSON file of fitted harmonic constituents. The app bundles
it and predicts entirely offline. Adding one is four steps.

## 1. Get gauge observations

UK gauge data is open via the **British Oceanographic Data Centre** (free
account → UK Tide Gauge Network → *processed* download). Pick the station, grab
a few full years (more years = a better fit; see below), and save the `.txt`
files. The BODC/NTSLF ASCII format is parsed automatically.

> ⚠️ Confirm the gauge actually exists in the BODC picker. Some "standard ports"
> (e.g. **Oban**) have *no* gauge — you fit a nearby one (Tobermory) and apply an
> Admiralty secondary-port offset instead (see `shift` below).

## 2. Fit the constituents

Fitting is done by the offline harmonic analyser (`scripts/tides.py` in the
`~/org` toolkit; vendoring it into `tools/` is on the roadmap). Pool **several
years** — a single short/gappy record can't separate close constituents
(S2/K2, K1/P1 need ≥ ~182 days) and inflates the tidal range roughly 2×.

```sh
tides.py fit --name Wick --out apps/mobile/assets/data/wick.json \
  --obs 2019WIC.txt 2020WIC.txt 2021WIC.txt 2022WIC.txt
```

For a secondary port derived from another gauge, record the offset with
`--default-shift` (it points at a `*_from_*.json` of time/height corrections).
Standard ports take no shift and predict directly.

**Validate the fit** against published Admiralty figures before trusting it:
check that the spring vs neap *ratio* is right (a bad fit collapses them), and
that HAT/LAT/MHWS/MLWS land in the printed band.

## 3. Register it

Drop the JSON in `apps/mobile/assets/data/`, then add it to
`apps/mobile/lib/stations.ts`:

```ts
import wickData from '@/assets/data/wick.json';
// ...
{
  id: 'wick',
  name: 'Wick',
  subtitle: 'Caithness / Pentland approaches',
  region: 'North-East',
  lat: 58.4413,
  lon: -3.0860,
  data: wickData as StationData,
  standardPort: true,
},
```

## 4. Re-run the parity gate

Add the station to `WINDOWS` in `tools/gen-reference.py`, regenerate the fixture,
and confirm the TypeScript engine still matches the Python oracle:

```sh
tools/gen-reference.py
cd apps/mobile && npm run test:engine
```

Green means the bundled engine reproduces the canonical prediction to
< 2 min / < 0.03 m. Done.

## A reminder on scope

These are **water-level (height) predictions, astronomical only.** They exclude
weather (surge) and are **not tidal streams**. Stream-dominated places — the
Pentland Firth, Falls of Lora, Kylerhea — need a tidal stream atlas, never these
tables.
