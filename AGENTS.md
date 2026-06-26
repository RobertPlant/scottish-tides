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
`tides.py` (< 2 min on event times, < 0.03 m on heights). Regenerate the vectors
with `tools/gen-reference.sh` if you add a station.

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

## More RN-Web quirks (from the sibling OtterPool e2e suite)

- `Text` with `numberOfLines={N}` renders via `-webkit-box` line clamping;
  Playwright's `toBeVisible()` flags those as hidden — use `toBeAttached()`.
- expo-router on web keeps the previous tab screen mounted; locators can resolve
  to two elements — scope to `:visible` before interacting.
- Playwright on NixOS: browsers come from `pkgs.playwright-driver.browsers` via
  the root `devenv.nix`; run inside the devenv shell.
