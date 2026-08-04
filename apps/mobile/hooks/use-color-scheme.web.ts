import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

/**
 * The colour scheme, safe for static rendering. The web build is pre-rendered on
 * the server, where there is no scheme to read — so the server snapshot is
 * always 'light' and React re-renders with the real one after hydration. That is
 * what `useSyncExternalStore`'s third argument is for; the previous hydrated
 * flag did the same thing by calling setState inside an effect, which is a
 * cascading render React now warns about.
 */
export function useColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    (onChange) => Appearance.addChangeListener(onChange).remove,
    () => (Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'),
    () => 'light',
  );
}
