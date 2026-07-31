// One coarse fix for the "nearest station to me" button, on iOS.
// Android has its own implementation in `native-location.android.ts` — see the
// note there for why the two platforms differ.

import * as Location from 'expo-location';

export type Coords = { latitude: number; longitude: number };

/** Coords, or `null` if the user refused permission. Throws if no fix. */
export async function getCurrentCoords(): Promise<Coords | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    return null;
  }
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
}
