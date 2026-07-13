import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SelectedStationProvider } from '@/lib/selected-station';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // The scoped @react-native-vector-icons/* static packages don't register their
  // web @font-face (unlike the old @expo/vector-icons), so the tab-bar glyphs render
  // as tofu on web unless we load the font ourselves. Harmless on native, where the
  // config plugin already bundles it.
  useFonts({
    Ionicons: require('@react-native-vector-icons/ionicons/fonts/Ionicons.ttf'),
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SelectedStationProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="station/[id]" options={{ title: 'Tides' }} />
              <Stack.Screen name="stream/[id]" options={{ title: 'Stream' }} />
              <Stack.Screen name="about" options={{ title: 'About' }} />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </SelectedStationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
