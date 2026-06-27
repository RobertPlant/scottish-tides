import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SelectedStationProvider } from '@/lib/selected-station';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <SelectedStationProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="station/[id]" options={{ title: 'Tides' }} />
            <Stack.Screen name="stream/[id]" options={{ title: 'Stream' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SelectedStationProvider>
    </SafeAreaProvider>
  );
}
