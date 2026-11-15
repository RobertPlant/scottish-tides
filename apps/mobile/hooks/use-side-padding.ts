import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Horizontal padding for a screen's scroll content that clears the display
 * cutout and rounded corners at the side in landscape. Headers and the tab bar
 * already pad for these themselves.
 */
export function useSidePadding() {
  const { left, right } = useSafeAreaInsets();
  return { paddingLeft: 16 + left, paddingRight: 16 + right };
}
