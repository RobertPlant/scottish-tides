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
signing identity — for a real release, sign with your own key, and remember
F-Droid signs its own builds with its key regardless.

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

`fdroid/com.robertplant.scottishtides.yml` is the ready-made recipe: copy it to
`metadata/com.robertplant.scottishtides.yml` in a fork of
[fdroiddata](https://gitlab.com/fdroid/fdroiddata) and open a merge request. It
installs Node 24, runs `npm ci` + `expo prebuild`, strips the template's debug
`signingConfig` (F-Droid signs its own), and builds `assembleRelease`.

Requirements it already satisfies: GPL-3.0-only, all source in the repo, no
proprietary dependencies, no analytics/ads, reproducible from a tagged commit.
