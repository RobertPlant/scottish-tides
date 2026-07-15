import Ionicons from '@react-native-vector-icons/ionicons/static';
import { Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSelectedStation } from '@/lib/selected-station';

export default function TabsLayout() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { stationId } = useSelectedStation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: palette.tabIconSelected,
        tabBarInactiveTintColor: palette.tabIconDefault,
        headerStyle: { backgroundColor: palette.background },
        headerTintColor: palette.text,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
      }}
    >
      {/* `/` just redirects to the selected station — hidden from the tab bar. */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen
        name="station/[id]"
        options={{
          title: 'Tides',
          // The Station tab always points at the currently selected station.
          href: { pathname: '/station/[id]', params: { id: stationId } },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="water-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="plan/[id]"
        options={{
          title: 'Plan',
          // Like the Tides tab, the Plan tab tracks the selected station.
          href: { pathname: '/plan/[id]', params: { id: stationId } },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
