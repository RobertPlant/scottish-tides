// Android uses our own LocationManager module rather than `expo-location`,
// which hard-depends on the proprietary Google Play Services location library —
// forbidden in F-Droid's main repo (docs/android-build.md). `expo-location` is
// also excluded from Android autolinking in package.json, so this platform
// split is what keeps it out of the bundle too.

import PlatformLocation, { type Coords } from '@/modules/platform-location';

export type { Coords };

/** Coords, or `null` if the user refused permission. Throws if no fix. */
export async function getCurrentCoords(): Promise<Coords | null> {
  const { granted } = await PlatformLocation.requestPermissionsAsync();
  if (!granted) {
    return null;
  }
  return await PlatformLocation.getCurrentPositionAsync();
}
