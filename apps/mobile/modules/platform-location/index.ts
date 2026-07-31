import { requireNativeModule } from 'expo';

export type Coords = { latitude: number; longitude: number };

type PlatformLocationModule = {
  /** Standard Expo permission response; `granted` covers coarse or fine. */
  requestPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  /** Rejects if location is off or no provider returns a fix. */
  getCurrentPositionAsync(): Promise<Coords>;
};

export default requireNativeModule<PlatformLocationModule>('PlatformLocation');
