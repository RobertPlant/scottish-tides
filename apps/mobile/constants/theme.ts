/**
 * Colours for the app, light and dark. Plain StyleSheet theming (no Nativewind),
 * matching the sibling OtterPool project. The palette is a cold North-Atlantic
 * sea theme: deep navy, slate, and a kelp/teal accent.
 */

import { Platform } from 'react-native';

const deepNavy = '#0b2942';
const seaTeal = '#1f9e9a';
const highWater = '#2f7fd1'; // rising / flood
const lowWater = '#c9772f'; // falling / ebb

export const Colors = {
  light: {
    text: '#0c1722',
    background: '#eef3f6',
    surface: '#ffffff',
    tint: deepNavy,
    icon: '#5b6b78',
    tabIconDefault: '#8a98a3',
    tabIconSelected: deepNavy,
    border: '#d6dee4',
    muted: '#5f6e79',
    accent: seaTeal,
    high: highWater,
    low: lowWater,
  },
  dark: {
    text: '#e7eef3',
    background: '#06121d',
    surface: '#0e1f2d',
    tint: '#7fd4d0',
    icon: '#8ea0ad',
    tabIconDefault: '#5b6b78',
    tabIconSelected: '#7fd4d0',
    border: '#1b2d3a',
    muted: '#8ea0ad',
    accent: seaTeal,
    high: '#5aa0e6',
    low: '#e0954f',
  },
};

export const SeaPalette = {
  deepNavy,
  seaTeal,
  highWater,
  lowWater,
  land: ['#1d3b2a', '#2c4a2e'],
  foam: '#dceaf0',
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
