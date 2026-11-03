import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The whole palette for the active scheme. */
export function usePalette() {
  return Colors[useColorScheme()];
}
