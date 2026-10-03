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
(a universal APK — all four ABIs, ~100 MB; F-Droid publishes it as-is). With
`ABI=arm64-v8a` it drops to roughly a quarter of that, which is the one to use
for sideloading onto a modern phone.

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

- **Every script list is one shell.** fdroidserver joins `sudo:`, `prebuild:`
  and `build:` with `&&`, so a `cd` carries over and later paths are relative
  to it. `subdir: apps/mobile` makes the scripts and `output:` start there;
  `scanignore`/`scandelete` paths stay relative to the repo root.
- **`sudo:`** installs Node 24 from the official tarball with a pinned sha256.
  It has to be 24: the lockfile is npm 11's, and `npm ci` under Node 22's
  npm 10 fails with *"Missing: <pkg> from lock file"*. Bump the URL and hash
  together with the Node pin everywhere else (`devenv.nix`, the workflows).
- **`prebuild:`** runs `npm ci` and `expo prebuild` (`android/` is generated),
  then strips the template's debug `signingConfig` so the APK comes out unsigned
  for F-Droid to sign. Dependencies are fetched here rather than in `build:`
  because the source scanner runs between the two — it must see
  `node_modules`.
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
nix shell nixpkgs#fdroidserver -c fdroid lint com.robertplant.scottishtides
nix shell nixpkgs#fdroidserver -c fdroid rewritemeta com.robertplant.scottishtides  # must not change it
nix shell nixpkgs#fdroidserver -c fdroid checkupdates -v com.robertplant.scottishtides
```

`fdroid scanner com.robertplant.scottishtides` runs the prebuild and scans the
result. Run it inside `devenv shell`, so Node 24 is on the path. The nixpkgs
build of the scanner crashes on import (`file`'s `magic.py` shadows
`python-magic`), so use `pip install fdroidserver` in a venv for this one. To scan
unpushed work, point `Repo:` at a local checkout and `commit:` at a SHA. The
full `fdroid build` needs F-Droid's buildserver image; the fdroiddata merge
request's CI runs it.

### Releasing to F-Droid

1. Release as usual (bump `version`/`versionCode`, tag `vX.Y.Z`), and in the
   same commit bump the recipe's `Builds` entry and `CurrentVersion*`.
   fdroiddata requires `commit:` to be the tag's full SHA, not the tag name, so
   fill that in once the tag exists.
2. First submission only: fork fdroiddata, copy the recipe to
   `metadata/com.robertplant.scottishtides.yml` and open a merge request.
   Fix anything its CI pipeline reports, both here and in the MR.
3. After it's merged, fdroiddata's checkupdates bot finds new tags by itself
   (`AutoUpdateMode: Version`). Change the recipe in fdroiddata only when the
   build steps themselves change.

### Reproducible builds

F-Droid rebuilds each tag from source, compares the result with the APK on the
GitHub release (`Binaries:`), and if they match apart from the signature, ships
the APK signed with our key (`AllowedAPKSigningKeys:`, the SHA-256 of the
release certificate). So GitHub and F-Droid installs can update each other. If
they don't match, F-Droid publishes nothing for that version.

That only works while `release.yml` builds exactly as the recipe does: Node
24.21.0, `npm ci --omit=dev`, JDK 21 for Gradle plus JDK 17 (the toolchain React
Native and Expo compile Kotlin with; trixie lacks it, so the recipe takes it
from bookworm), F-Droid's build path
(`/home/vagrant/build/com.robertplant.scottishtides`, which native libraries
embed), and the APK signed straight out of Gradle with no `zipalign` pass.
Change one side, change the other.

`.github/workflows/fdroid-verify.yml` checks it. It builds a commit through
`release.yml` and through `fdroid build` in F-Droid's buildserver image, then
runs `apksigcopier compare`. It runs on PRs that touch the recipe or the
release workflow, and can be run by hand (Actions → F-Droid reproducibility
check) before tagging, e.g. after native dependency upgrades.

Requirements it already satisfies: GPL-3.0-only, all source in the repo, no
proprietary dependencies, no analytics/ads, reproducible from a tagged commit.
