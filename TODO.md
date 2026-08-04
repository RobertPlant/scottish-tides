# Scottish Tides — TODO / handoff

Status snapshot (for picking up cold). Repo: https://github.com/RobertPlant/scottish-tides
Stack: Expo SDK 57 universal app (web/iOS/Android), GPL-3.0, no backend, offline PWA.
Gates: `tsc` clean · `npm run test:unit` 36/36 · `npm run test:engine` 22/22 ·
`npm run test:e2e` 16/16 (run e2e in `devenv shell`) · `biome ci` clean.
All of these are enforced in CI.

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
- [x] **Dependabot advisories reviewed** — all (now 13 moderate) trace to a single transitive
      `uuid <11.1.1` pulled in by the Expo build tooling (`xcode` → `@expo/config-plugins` →
      `@expo/cli`). It's dev/build-time only (never bundled into the app), and the bug needs an
      attacker-controlled `buf` that Expo never passes. Non-actionable — `npm audit fix --force`
      would downgrade Expo to v40/46. Dismiss the GitHub alert as "not used at runtime".

## 2. Streams — refinements (timing is calibrated; these are the known gaps)
- [ ] **Rate magnitudes (knots) are uncalibrated** — neither XTide/fallsoflora nor the free
      sources publish current speed. `springPeakKn`/`headRateScale` are indicative. Refine if
      atlas/diamond figures become available.
- [ ] **Flood/ebb asymmetry**: gate model uses symmetric magnitudes, but e.g. Corryvreckan
      W-going 8.5 kn vs E-going "rather less". Add a per-race flood:ebb ratio.
- [ ] **Re-check the Falls of Lora turn times against fallsoflora.info.** The
      reservoir filter's warm-up went from 16 h to 48 h (it was still carrying up
      to 5 min of its "loch starts at sea level" initial guess into the day, and
      the model claims ~12 min). Turn times move by up to ~5 min, so the
      calibration was fitted with that transient in it.
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
- [x] **Biome pass done** — `biome check --write apps/mobile` reformatted 12 files (line
      wrapping, array/object layout, redundant parens; no semantic changes). `tsc` + engine tests
      still green. The generated parity fixture (`lib/tides/__fixtures__/*.json`) is now Biome-
      excluded like `assets/data/*.json` so `gen-reference.py` output won't fight the formatter.
      NB: a global `rtk` command-rewrite hook (`~/.claude/hooks/rtk-rewrite.sh`) rewrites `biome`
      → `rtk lint`, which masked the pass at first — run Biome by absolute path to bypass it.
- [ ] **Retry the TypeScript 7 bump** once typescript-eslint supports the native (Go) port.
      Tried `typescript@7.0.2`: `tsc --noEmit` is clean and `test:engine` passes, but `expo lint`
      crashes at load — `@typescript-eslint`/`ts-api-utils` read internal TS APIs the Go port
      doesn't expose (`TypeError: Cannot read properties of undefined (reading 'Intrinsic')`).
      CI now *does* run `tsc --noEmit` (the `lint` job), so a TS7 bump has to keep that green —
      it did when tried. `expo lint` is still not in CI, so the crash wouldn't block a merge, but
      it would break local linting. Revisit when typescript-eslint ships a TS7-compatible release,
      then it should be a clean bump.
- [x] **About screen** done (`app/about.tsx`, linked from the Map tab): data attribution (BODC,
      Natural Earth, pytides, fallsoflora), GPL source link, app version, and disclaimer.
- [ ] **Unit toggles** (metres/feet, 12/24 h) — still to build. Needs a small settings store
      (AsyncStorage, like `selected-station`) and a Settings entry to surface them.

## 4. Data / stations
- [ ] Add more BODC station fits (needs Rob to download zips from the BODC picker, as before).
      Candidates: Stornoway is in; consider Kinlochbervie done; add e.g. Tarbert, Mallaig,
      Campbeltown, Lerwick (have), Kirkwall (Orkney).
- [ ] Re-run `tools/gen-reference.py` if any station JSON changes (keeps the parity test honest).

## 5. Native (currently web-first)
- [x] **Geolocation works on native** — `map.tsx` calls `lib/native-location.ts`, which keeps the
      browser `navigator.geolocation` path on web, `expo-location` on iOS, and our own
      `modules/platform-location` on Android (see below).
- [x] **Android release APK builds locally** — `npm run build:android` inside `devenv shell`
      (prebuild + `gradlew assembleRelease`). Toolchain is pinned in `devenv.nix`; `android/` stays
      generated and gitignored. See `docs/android-build.md`.
- [x] **F-Droid-eligible** — no Play Services anywhere in the APK. `expo-location` hard-depends on
      `play-services-location`, which F-Droid forbids outright, and every drop-in alternative is the
      same or abandoned (`expo-get-location` died at SDK 49). Android instead uses a ~60-line local
      Expo module over the platform `LocationManager`, plus `expo.autolinking.android.exclude` and a
      Metro platform split to keep `expo-location` out of the Android build entirely. Submission
      recipe: `fdroid/com.robertplant.scottishtides.yml`.
- [ ] Actually submit the fdroiddata MR (needs a `v0.1.0` tag first, and a
      screenshots/description drop under `metadata/en-US/`).
- [ ] iOS binaries still need a Mac or EAS — untried.

## 6. Feature roadmap (offered, not started)
- [ ] **Slack & best-window planner** — daylight ∩ gentle stream ∩ range → suggested paddle window.
- [x] **Year planner** — done. New **Plan** tab (`app/(tabs)/plan/[id].tsx` → `components/
      trip-planner.tsx`, `lib/planner.ts`): a whole-year heatmap (12 month rows × 31 aligned
      day cells), every day shaded on the station's neap↔spring scale (sequential teal ramp,
      contrast-aware ink, theme-selected). Weekends outlined, today marked; tap a day →
      `/station/[id]?d=`. Cells get a measured integer width so the grid stays uniform, and sit
      flush (no gaps → no dead-zone taps). Station switcher extracted to `components/
      station-chips.tsx` (shared with the Tides tab). Tests: `lib/planner.test.ts` +
      `e2e/planner.spec.ts`. NB: started as month+year with a toggle; the month grid was dropped
      as redundant. Neutral by design — no good/bad judgement (see the roadmap "best-window
      planner" below for an opinionated layer on top).
- [ ] **Weather overlay (optional, online)** — wind/swell from a free marine API (open-meteo),
      clearly marked "needs signal" (breaks the offline promise — deliberate opt-in).

## Notes / gotchas (don't relearn the hard way)
- Never use `fontVariant: ['tabular-nums']` — RN-Web 0.21 passes the array to the DOM and crashes.
- Don't pass an array `style` through `<Link asChild>` (renders `<a>`, same crash class) — use
  `useRouter().push()`.
- e2e on NixOS: `playwright.config.ts` points at the nix `chrome-headless-shell` when
  `PLAYWRIGHT_BROWSERS_PATH` is set; run inside `devenv shell`.
- e2e on the 3.8 GB builder box: Metro + Chrome together get OOM-killed (the run dies with no
  output at all). Run it as `NODE_OPTIONS=--max-old-space-size=1024 npx playwright test` there.
  The Android build is already capped separately by `plugins/with-low-memory-gradle.js`.
- `npx expo` misfires in this environment — use `./node_modules/.bin/expo`.
- Engine parity is the spine: any engine change must keep `npm run test:engine` green.
- **Never put `//` comments in `biome.json`.** Biome does not error — it silently falls back to
  its defaults, so `recommended: false` stops applying and the whole `includes` exclude list is
  discarded. Symptom: a sudden flood of lint errors from rules this repo doesn't enable, in
  `dist/` and `android/build/` files that should never be scanned. Rename to `biome.jsonc` if
  comments are ever genuinely needed.
- `biome.json`'s `includes` list can **not** be replaced by `vcs.useIgnoreFile`. Biome reads
  `.gitignore` relative to the config root (repo root); the entries that matter — `android`,
  `ios`, `dist`, `.expo`, `expo-env.d.ts` — live in the *nested* `apps/mobile/.gitignore`, which
  it does not consult. Keep the excludes explicit, and keep them in step with CI: `biome ci
  apps/mobile` must report the same file count locally as in the CI log (67 at the time of
  writing). A mismatch means a local pass and a CI pass don't mean the same thing.
