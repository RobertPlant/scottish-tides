# Scottish Tides — TODO / handoff

Status snapshot (for picking up cold). Repo: https://github.com/RobertPlant/scottish-tides
Stack: Expo SDK 54 universal app (web/iOS/Android), GPL-3.0, no backend, offline PWA.
Gates: `tsc` clean · `npm run test:engine` 22/22 · `npm run test:e2e` 8/8 (run e2e in `devenv shell`).

## Done (so you don't redo it)
- Offline harmonic tide engine (TS port of pytides/`~/org/scripts/tides.py`), validated to ~5e-5 m.
- 12 stations; real Natural-Earth coastline map; now/next; tide curve (tap-to-scrub); HW/LW table.
- Spring/neap + range + 7-day overview; height/threshold windows; sun & moon.
- Near-me (geolocation), favourites + last-station (AsyncStorage), shareable `?d=` links.
- Installable offline PWA (manifest + service worker, prod-only).
- Tidal streams: 6 races. Falls of Lora = sill/reservoir model calibrated to fallsoflora.info
  (~12 min). Gate races (Pentland/Corryvreckan/Grey Dogs/Dorus Mòr/Sound of Islay) slack-time
  calibrated from published figures (~5–15 min).

---

## 1. Deploy / CI — verify (can't check from this sandbox)
- [ ] Confirm the **GitHub Pages** Actions run is green and the site is live at
      https://robertplant.github.io/scottish-tides/ (Settings → Pages → source "GitHub Actions";
      the workflow self-enables via `configure-pages`, but verify).
- [ ] Confirm the **Tests** workflow (`.github/workflows/test.yml`) passes in CI (engine + e2e).
- [ ] Address the **3 moderate Dependabot** advisories flagged on push (`npm audit`).

## 2. Streams — refinements (timing is calibrated; these are the known gaps)
- [ ] **Rate magnitudes (knots) are uncalibrated** — neither XTide/fallsoflora nor the free
      sources publish current speed. `springPeakKn`/`headRateScale` are indicative. Refine if
      atlas/diamond figures become available.
- [ ] **Flood/ebb asymmetry**: gate model uses symmetric magnitudes, but e.g. Corryvreckan
      W-going 8.5 kn vs E-going "rather less". Add a per-race flood:ebb ratio.
- [ ] **Grey Dogs** and **Sound of Islay** offsets are approximate (taken from the adjacent
      Corryvreckan / Rhinns-of-Islay). Verify against a better source.
- [ ] Add a "**good transit window**" highlight on the stream curve (fallsoflora shows
      "Good from..to"); we currently show slack + peak only.
- [ ] More races: **Kylerhea**, **Cuan Sound**, **Sound of Mull**, Kyle of Lochalsh. Kylerhea
      needs a nearby reference station (none bundled near Skye — would need a gauge).

## 3. Repo / OSS hygiene
- [ ] **Vendor the fitter** into `tools/`: `tools/gen-reference.py` shebang points at
      `~/org/scripts/tides_lib` (only works on Rob's machine). Copy `tides.py` + vendored
      pytides2 so the repo is self-contained for contributors. Same for the coastline generator
      deps (documented as `npm i --no-save` in `tools/gen-coastline.mjs`).
- [ ] Run a **Biome format pass** (`npm run check` from repo root, in `devenv shell`) — code
      follows the style but Biome hasn't been run to normalise.
- [ ] **Retry the TypeScript 7 bump** once typescript-eslint supports the native (Go) port.
      Tried `typescript@7.0.2`: `tsc --noEmit` is clean and `test:engine` passes, but `expo lint`
      crashes at load — `@typescript-eslint`/`ts-api-utils` read internal TS APIs the Go port
      doesn't expose (`TypeError: Cannot read properties of undefined (reading 'Intrinsic')`).
      CI is unaffected (it doesn't run `tsc`). Revisit when typescript-eslint ships a TS7-compatible
      release, then it should be a clean bump.
- [ ] Add an **About/Settings** screen: data attribution (BODC, Natural Earth, fallsoflora),
      GPL source link, and unit toggles (metres/feet, 12/24 h).

## 4. Data / stations
- [ ] Add more BODC station fits (needs Rob to download zips from the BODC picker, as before).
      Candidates: Stornoway is in; consider Kinlochbervie done; add e.g. Tarbert, Mallaig,
      Campbeltown, Lerwick (have), Kirkwall (Orkney).
- [ ] Re-run `tools/gen-reference.py` if any station JSON changes (keeps the parity test honest).

## 5. Native (currently web-first)
- [ ] **Geolocation is web-only** (`navigator.geolocation`, gated to `Platform.OS === 'web'`).
      For native builds add `expo-location`.
- [ ] Set up **EAS build** config if native iOS/Android binaries are wanted (app.json has the
      package id `com.robertplant.scottishtides`).

## 6. Feature roadmap (offered, not started)
- [ ] **Slack & best-window planner** — daylight ∩ gentle stream ∩ range → suggested paddle window.
- [ ] **Month planner** — extend the 7-day strip to a month grid coloured by spring/neap.
- [ ] **Weather overlay (optional, online)** — wind/swell from a free marine API (open-meteo),
      clearly marked "needs signal" (breaks the offline promise — deliberate opt-in).

## Notes / gotchas (don't relearn the hard way)
- Never use `fontVariant: ['tabular-nums']` — RN-Web 0.21 passes the array to the DOM and crashes.
- Don't pass an array `style` through `<Link asChild>` (renders `<a>`, same crash class) — use
  `useRouter().push()`.
- e2e on NixOS: `playwright.config.ts` points at the nix `chrome-headless-shell` when
  `PLAYWRIGHT_BROWSERS_PATH` is set; run inside `devenv shell`.
- `npx expo` misfires in this environment — use `./node_modules/.bin/expo`.
- Engine parity is the spine: any engine change must keep `npm run test:engine` green.
