# Building the Android app (and staying F-Droid-eligible)

The Android project is **generated**, not committed: `apps/mobile/android` comes
out of `expo prebuild` (Expo CNG) and is in `.gitignore`. The JDK 17 and the
Android SDK/NDK are pinned in `devenv.nix`.

```bash
cd apps/mobile
npm run build:android              # → scripts/build-android.sh
ABI=arm64-v8a npm run build:android   # one ABI: much smaller and faster
PREBUILD=clean npm run build:android  # regenerate android/ from scratch
npm run build:android debug        # debug variant
```

`scripts/build-android.sh` re-execs itself inside `devenv shell` when
`ANDROID_HOME` is unset, so it works from a bare shell too. It also prebuilds
when `android/` is missing and skips `lintVitalRelease`.

Output: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
(a universal APK — all four ABIs, ~100 MB). With `ABI=arm64-v8a` it drops to
roughly 40 MB, which is the one to use for sideloading onto a modern phone.
Releases ship one APK per ABI, never the universal one (see "ABI split" below).

Locally the release APK is signed with Expo's template debug keystore, so it
installs straight away (`adb install -r <apk>`). It is **not** a distributable
signing identity. Real releases are signed with the project key by
`.github/workflows/release.yml`, and F-Droid ships that same signature (see
"Reproducible builds" below).

Bump `expo.android.versionCode` in `app.json` for every release F-Droid should
pick up, and tag the commit `vX.Y.Z` (the metadata's `UpdateCheckMode: Tags`
depends on it).

**NixOS gotcha:** the Android Gradle Plugin downloads its own `aapt2` from
Maven, and that binary can't run on NixOS — a raw `./gradlew assembleRelease`
dies with *"AAPT2 … Daemon startup failed"*. `build-android.sh` handles it by
passing `-Pandroid.aapt2FromMavenOverride=` at the newest `aapt2` under
`$ANDROID_HOME/build-tools`. That's why you should go through the script rather
than calling Gradle directly, and why the override is never written into
`gradle.properties` (a Nix store path there would break CI and F-Droid).

## No Google Play Services — and why that took work

F-Droid's [inclusion policy](https://f-droid.org/docs/Inclusion_Policy/) forbids
Play Services outright ("strictly forbidden in all applications"), so *any*
`com.google.android.gms` artifact in the APK disqualifies the app.

`expo-location` has an unconditional `api
'com.google.android.gms:play-services-location'`, and every off-the-shelf
alternative is the same or worse:

| Option | Verdict |
|---|---|
| `@react-native-community/geolocation` | Hard-codes `play-services-location`, no flag |
| `react-native-geolocation-service` | `forceLocationManager` is runtime-only; the proprietary AAR is still bundled |
| `expo-get-location` (the "F-Droid fork") | Abandoned — last release July 2023, Expo SDK 49 |

So Android gets its own tiny module instead:

- **`apps/mobile/modules/platform-location/`** — a local Expo module (autolinked
  from `modules/`, so it needs no committed native project). ~60 lines of Kotlin
  over the platform's own `LocationManager`: takes a cached fix if one is under
  five minutes old, otherwise asks every enabled provider at once and keeps the
  first to answer. Zero dependencies.
- **`apps/mobile/lib/native-location.android.ts`** vs **`native-location.ts`** —
  a Metro platform split, so the Android bundle never imports `expo-location`.
  iOS still uses `expo-location` (CoreLocation, nothing proprietary there).
- **`expo.autolinking.android.exclude` in `package.json`** — drops
  `expo-location`'s native code from the Android build while leaving it linked
  on iOS.

Verify a build is clean — this is the check that matters, run it after any
dependency change:

```bash
cd apps/mobile/android/app/build/outputs/apk/release
python3 - <<'EOF'
import zipfile
z = zipfile.ZipFile('app-release.apk')
hits = sum(z.read(n).count(b'com/google/android/gms') for n in z.namelist() if n.endswith('.dex'))
print('play-services refs:', hits)   # must be 0
EOF
```

`expo-modules-autolinking resolve -p android --json` is the other useful check:
`expo-location` must not appear in the module list, `platform-location` must.

## Store listing (fastlane metadata)

`fastlane/metadata/android/en-US/` holds the title, summary, description and
screenshots. fdroidserver reads this straight from the repo, so it is the only
copy — the fdroiddata recipe deliberately doesn't repeat it.

```bash
cd apps/mobile
npm run screenshots                 # export the web build, then capture
SKIP_EXPORT=1 npm run screenshots   # reuse the existing dist/
```

`scripts/gen-screenshots.mjs` shoots the **production** export served over a
tiny static server, not the Metro dev server — in dev, LogBox paints a red error
toast over the UI and it ends up in the screenshots. Three things it has to get
right, all of which bit once: the export is served under the `baseUrl` prefix
(`/scottish-tides`) or no asset resolves; the server maps `/map` → `/map.html`,
because expo-router treats the `.html` suffix as an unmatched route; and the
browser runs with `LANG=en_GB.UTF-8`, since Chrome renders `<input type=date>`
in its own UI locale and would otherwise show US `mm/dd/yyyy`.

The `devenv.nix` `FONTCONFIG_FILE` exists for the same reason — the box ships no
fonts, so captures came out with tofu boxes for the 📍 emoji. It pins Roboto,
which is what Android renders with anyway.

## Submitting to F-Droid

`fdroid/com.robertplant.scottishtides.yml` is the ready-made recipe, kept
byte-for-byte as it goes into
[fdroiddata](https://gitlab.com/fdroid/fdroiddata). That's why it has no
comments: fdroiddata CI fails any file that `fdroid rewritemeta` would change,
and rewritemeta strips comments and reorders keys. The reasoning lives here:

It follows fdroiddata's `templates/build-react-native.yml`, which reviewers ask
every React Native app to use, except where a generated `android/` rules it out
(`subdir:` and `build:`, below):

- **Every script list is one shell.** fdroidserver joins `sudo:`, `init:`,
  `prebuild:` and `build:` with `&&`, so a `cd` carries over. `subdir:
  apps/mobile` makes the scripts and `output:` start there;
  `scanignore`/`scandelete` paths stay relative to the repo root. The template's
  `subdir: android/app` with `gradle: yes` needs a committed `android/`, which
  fdroidserver checks for before anything runs; ours is generated, hence a
  `build:` script (as in the accepted `xyz.hub13.remindiary`).
- **`sudo:`** installs `nodejs npm` from Debian forky, as reviewers ask.
  Forky's Node is 24.21.0, the same version the release workflow and
  `devenv.nix` pin; keep them in step when forky moves. It has to be ≥ 24: the
  lockfile is npm 11's, and `npm ci` under npm 10 fails with *"Missing: <pkg>
  from lock file"*.
- **`init:`** runs `npm ci`. Dependencies are fetched before the source scanner
  runs, because it must see `node_modules`.
- **`prebuild:`** moves every JDK 17 pin in `node_modules` to 21 (React
  Native's toolchain, Java targets, and Kotlin `jvmTarget`s such as
  datetimepicker's; the buildserver only has JDK 21; the `find … sed` form is
  the one accepted for `de.killi199.timetracking`), runs `expo prebuild`
  (`android/` is generated), then strips the template's debug `signingConfig`
  so the APK comes out unsigned.
- **`scandelete:` / `scanignore:`** triage what the scanner finds in
  `node_modules` (96 problems before triage). `scandelete: apps/mobile/node_modules`
  deletes only the files the scanner flags, so a dependency bump that adds a new
  one doesn't break the F-Droid build. What it deletes today: Expo's precompiled
  `local-maven-repo` AARs (unused — see `buildFromSource` below), iOS-only
  artefacts, `fb-dotslash` (dev server only), hermesc's macOS/Windows builds, and
  `expo-location/android` (the Play Services reference; already excluded from
  autolinking). `scanignore` wins over `scandelete`, and keeps the files the
  build needs: RN library `build.gradle`s whose "unknown maven repo" is a path
  inside `node_modules`, and the Linux `hermesc`, which compiles the JS bundle
  to bytecode at build time. Both the broad `scandelete` and this `scanignore`
  list (hermesc included) match accepted Expo recipes in fdroiddata, e.g.
  `io.suvam.dhaaga.lite`.
- **`buildFromSource: [".*"]`** in `apps/mobile/package.json`: Expo modules
  ship precompiled AARs and Android links those unless told otherwise. F-Droid
  only ships what it compiles, so every module is built from source — in both
  channels, so the GitHub APK is the same code.
- **`build:`** calls `gradle`, which on the buildserver is `gradlew-fdroid` (it
  reads the wrapper's version and fetches a checksum-verified distribution).
- **ABI split:** four builds, one per ABI, each passing
  `reactNativeArchitectures=<abi>`. `plugins/with-abi-split.js` turns a single
  ABI into an `abiFilters` (otherwise prebuilt `.so`s from AARs ship for every
  ABI) and a versionCode of `10 * base + n`: armeabi-v7a 1, arm64-v8a 2, x86 3,
  x86_64 4, which is the recipe's `VercodeOperation`. `app.json` keeps the base.
- **`plugins/with-release-permissions.js`** removes `INTERNET`,
  `SYSTEM_ALERT_WINDOW` and the storage permissions that React Native and Expo
  merge in. The app uses none of them, and reviewers ask about each. It only
  touches release builds; debug builds need `INTERNET` to reach Metro.
- **`plugins/with-release-shrinking.js`** turns on R8 (`minifyEnabled`) and
  resource shrinking for release builds, which reviewers ask for. R8 can remove
  code only reached by reflection, and the build still succeeds, so after a
  dependency change, install a release APK and use the app before tagging.
  Expo's and React Native's own keep rules cover their modules; add ours to
  `proguard-rules.pro` via a plugin if something does go missing. R8 needs more
  than the 1.5 GB heap `with-low-memory-gradle` caps Gradle at, so CI and the
  recipe pass `-Dorg.gradle.jvmargs=-Xmx4g …`, which overrides it. A local
  release build on a ~4 GB box may not have that much to give.
- **`UpdateCheckData`** reads `versionCode`/`version` from
  `apps/mobile/app.json`. `UpdateCheckMode: Tags` otherwise looks in
  `build.gradle`, which isn't committed.
- **`plugins/with-no-dependencies-info.js`** turns off AGP's `dependenciesInfo`
  block (a dependency list encrypted to Google's key, embedded in the signing
  block), which F-Droid asks apps to drop.

Check it locally before submitting, in a scratch fdroiddata layout. You need
`metadata/` holding the recipe, fdroiddata's `config/categories.yml` with its
`icon:` lines removed, and `git init` plus a commit, because `checkupdates`
refuses to run in a dirty tree:

```bash
fdroid() { nix shell nixpkgs#uv -c uvx --with 'ruamel.yaml==0.18.10' --from git+https://gitlab.com/fdroid/fdroidserver.git fdroid "$@"; }
fdroid lint com.robertplant.scottishtides
fdroid rewritemeta com.robertplant.scottishtides  # must not change it
fdroid checkupdates -v com.robertplant.scottishtides
```

Match fdroiddata's `rewritemeta` CI job exactly, or its formatting check fails:
fdroidserver's master (not nixpkgs' release, which doesn't wrap long values at
all) with Debian trixie's ruamel.yaml, 0.18.10 (the latest, 0.19, wraps lines
differently). If the job's image moves past trixie, bump the pin to match.

`fdroid scanner com.robertplant.scottishtides` runs the prebuild and scans the
result. Run it inside `devenv shell`, so Node 24 is on the path. The nixpkgs
build of the scanner crashes on import (`file`'s `magic.py` shadows
`python-magic`), so use `pip install fdroidserver` in a venv for this one. To scan
unpushed work, point `Repo:` at a local checkout and `commit:` at a SHA. The
full `fdroid build` needs F-Droid's buildserver image; the fdroiddata merge
request's CI runs it.

### Releasing to F-Droid

1. Release as usual (bump `version`, and `versionCode` by one: it's the base the
   four APKs' codes come from), tag `vX.Y.Z`, and in the same commit bump the
   recipe's four `Builds` entries and `CurrentVersion*` (`CurrentVersionCode` is
   the x86_64 one, `10 * base + 4`).
   fdroiddata requires `commit:` to be the tag's full SHA, not the tag name, so
   fill that in once the tag exists.
2. First submission only: fork fdroiddata, copy the recipe to
   `metadata/com.robertplant.scottishtides.yml` and open a merge request.
   Fix anything its CI pipeline reports, both here and in the MR.
3. After it's merged, fdroiddata's checkupdates bot finds new tags by itself
   (`AutoUpdateMode: Version`). Change the recipe in fdroiddata only when the
   build steps themselves change.

### Reproducible builds

F-Droid rebuilds each tag from source, once per ABI, compares each result with
that ABI's APK on the GitHub release (each build's `binary:`), and if they match
apart from the signature, ships the APK signed with our key (`AllowedAPKSigningKeys:`, the SHA-256 of the
release certificate). So GitHub and F-Droid installs can update each other. If
they don't match, F-Droid publishes nothing for that version.

That only works while `release.yml` builds exactly as the recipe does: Node
24.21.0, `npm ci --omit=dev`, JDK 21 with the same toolchain patch (and
toolchain auto-detection off, so the runner's JDK 17 isn't picked up),
F-Droid's paths (the build dir
`/home/vagrant/build/com.robertplant.scottishtides`, `GRADLE_USER_HOME`
`/home/vagrant/.gradle` and the SDK at `/opt/android-sdk`, all of which end up
inside the native libraries), the same `reactNativeArchitectures` and
`-PreactNativeDevServerIp=localhost` (or React Native bakes the build machine's
IP into `resources.arsc`), and the APK signed
straight out of Gradle with no realignment (no `zipalign`, and `apksigner
--alignment-preserved`).
Change one side, change the other.

`.github/workflows/fdroid-verify.yml` checks it. It builds a commit through
`release.yml` and through `fdroid build` in F-Droid's buildserver image, for
each ABI, then runs `apksigcopier compare` on each pair. It runs on PRs that touch the recipe or the
release workflow, and can be run by hand (Actions → F-Droid reproducibility
check) before tagging, e.g. after native dependency upgrades.

Requirements it already satisfies: GPL-3.0-only, all source in the repo, no
proprietary dependencies, no analytics/ads, reproducible from a tagged commit.
