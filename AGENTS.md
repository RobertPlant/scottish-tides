# Agent notes

Monorepo: `apps/mobile` (Expo universal app), `tools/` (station-fitting
helpers), `docs/`. Toolchain is pinned via `devenv.nix` at the repo root
(Node 22, Biome, Playwright browsers). Format/lint with Biome from the root
(`npm run check`); the app keeps `expo lint` for Expo-specific rules.

## Stack

Expo SDK 54, Expo Router 6, React Native 0.81, react-native-web. Styling is
plain `StyleSheet` + a light/dark `Colors` palette in `constants/theme.ts`
(`ThemedText` / `ThemedView` / `useThemeColor`), matching the sibling OtterPool
project. No backend, no auth, no network calls at runtime — everything the app
needs is bundled.

## The tide engine is the keystone

`apps/mobile/lib/tides/` is a TypeScript port of the harmonic predictor in
`~/org/scripts/tides.py` (vendored pytides2). It must stay numerically faithful
to the Python: **any change to the engine has to keep `npm run test:engine`
green**, which checks predictions against reference vectors generated from
`tides.py`. The strict gate is the hourly-height match (~5e-5 m actual); the
high/low-water *time* tolerance is amplitude-aware because near-amphidromic flat
ports (e.g. Port Ellen, ~0.5 m range) have ill-conditioned turning-point timing.
Regenerate the vectors with `tools/gen-reference.py` if you add a station.

Station data lives in `apps/mobile/assets/data/*.json` (one file per port:
constituents + datum + provenance) with a registry in
`apps/mobile/lib/stations.ts`. Some ports carry a `default_shift` to a secondary
port (e.g. Oban is derived from Tobermory by a constant offset). See
`docs/adding-a-station.md`.

## RN-Web quirks

- **Don't pass an array `style` through `<Link asChild>`.** expo-router `<Link>`
  renders an `<a>` on web; with `asChild` the child's `style={[...]}` array
  reaches the `<a>` DOM node and React DOM throws *"Failed to set an indexed
  property [0] on CSSStyleDeclaration"* on mount. Use `useRouter().push()` on a
  plain `Pressable` instead (RNW flattens Pressable styles fine). NB with
  `unstable_settings.anchor`, the anchor tab mounts *under* pushed Stack screens,
  so a bad Home-screen Link crashes every route, not just `/`.

## Tests

Two layers, both in CI (`.github/workflows/test.yml`):

- **Engine parity** — `npm run test:engine` (node --test + tsx) checks the TS
  engine against the committed pytides reference (`lib/tides/__fixtures__/`).
- **e2e** — `npm run test:e2e` (Playwright) drives the web build: routes render
  without the React error overlay, the station list, the date picker changes the
  day, and deep links render on direct load. Specs in `e2e/`.

Running e2e on NixOS: `playwright.config.ts` auto-detects the devenv-provided
`PLAYWRIGHT_BROWSERS_PATH` and points Playwright straight at the nix
`chrome-headless-shell` via `executablePath` (the npm package's expected browser
build won't match the nixpkgs one otherwise). Run inside `devenv shell`. In CI
there's no such env var, so Playwright uses its own downloaded browser.

## More RN-Web quirks

- `Text` with `numberOfLines={N}` renders via `-webkit-box` line clamping;
  Playwright's `toBeVisible()` flags those as hidden — use `toBeAttached()`.
- expo-router on web keeps the previous tab screen mounted (and the
  `unstable_settings.anchor` tab stays mounted under pushed Stack screens);
  locators can resolve to two elements — scope to `:visible` / use `.first()`.
- Driving a controlled `<input type="date">` from a test: `fill()` doesn't fire
  React's `onChange`; set `.value` via the prototype setter and dispatch
  `input`+`change`. Also wait for dev-mode hydration first, or the synthetic
  event has no listener yet.
