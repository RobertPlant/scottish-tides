#!/usr/bin/env bash
# Build a Scottish Tides Android APK locally — no EAS/cloud, the F-Droid path.
#
# Wraps the two environment-specific bits so you don't have to remember them:
#   * runs inside the devenv shell (Android SDK/NDK, JDK 17), and
#   * points the Android Gradle Plugin at the Nix-patched aapt2 — the one AGP
#     downloads from Maven is an unpatched ELF that won't start on NixOS.
#
# Usage (from anywhere in the repo):
#   apps/mobile/scripts/build-android.sh                 # release APK, all ABIs
#   apps/mobile/scripts/build-android.sh debug           # debug APK
#   ABI=arm64-v8a apps/mobile/scripts/build-android.sh   # one ABI: faster, less RAM
#   PREBUILD=1    apps/mobile/scripts/build-android.sh   # regenerate android/ first
#   PREBUILD=clean apps/mobile/scripts/build-android.sh  # wipe + regenerate android/
#
# Memory tuning (heap, single worker, no parallel) lives durably in
# plugins/with-low-memory-gradle.js, so it survives prebuild automatically.
set -euo pipefail

variant="${1:-release}"
case "$variant" in
  release) task="assembleRelease" ;;
  debug)   task="assembleDebug" ;;
  *) echo "error: unknown variant '$variant' (use 'release' or 'debug')" >&2; exit 2 ;;
esac

# Absolute paths so the script works from any CWD.
script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
repo_root="$(cd "$(dirname "$script_path")/../../.." && pwd)"
mobile_dir="$repo_root/apps/mobile"

# devenv.nix lives at the repo root; re-exec inside the devenv shell if we're not
# already in it (ANDROID_HOME is our marker).
if [ -z "${ANDROID_HOME:-}" ]; then
  echo "→ entering devenv shell…"
  cd "$repo_root"
  exec devenv shell -- bash "$script_path" "$@"
fi

cd "$mobile_dir"

# Generate the native android/ project on demand (it's gitignored).
if [ "${PREBUILD:-}" = clean ]; then
  ./node_modules/.bin/expo prebuild -p android --no-install --clean
elif [ -n "${PREBUILD:-}" ] || [ ! -d android ]; then
  ./node_modules/.bin/expo prebuild -p android --no-install
fi

# Highest-versioned aapt2 from the Nix SDK (robust to build-tools version bumps).
# A glob, not `find`: the Nix SDK's build-tools dirs are symlinks that `find`
# won't descend into without -L.
aapt2="$(ls -d "$ANDROID_HOME"/build-tools/*/aapt2 2>/dev/null | sort -V | tail -1)"
if [ -z "$aapt2" ]; then
  echo "error: no aapt2 found under \$ANDROID_HOME/build-tools" >&2; exit 1
fi

gradle_args=(--no-daemon "-Pandroid.aapt2FromMavenOverride=$aapt2")
[ -n "${ABI:-}" ] && gradle_args+=("-PreactNativeArchitectures=$ABI")
# The release lint pass is heavy and not needed for a build artifact.
[ "$variant" = release ] && gradle_args+=(-x lintVitalRelease)

echo "→ ./gradlew $task ${gradle_args[*]}"
( cd android && ./gradlew "$task" "${gradle_args[@]}" )

apk="$mobile_dir/android/app/build/outputs/apk/$variant/app-$variant.apk"
if [ -f "$apk" ]; then
  echo
  echo "✔ APK: $apk ($(du -h "$apk" | cut -f1))"
else
  echo "warning: build finished but APK not found at $apk" >&2
  exit 1
fi
