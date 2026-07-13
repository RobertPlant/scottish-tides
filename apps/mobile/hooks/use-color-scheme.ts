import { useColorScheme as useRNColorScheme } from 'react-native';

/** Normalises RN's scheme (which can be null/'unspecified') to just light/dark. */
export function useColorScheme(): 'light' | 'dark' {
  return useRNColorScheme() === 'dark' ? 'dark' : 'light';
}
