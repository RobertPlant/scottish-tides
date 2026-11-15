import { StyleSheet, Text, type TextProps } from 'react-native';

import { usePalette } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'caption';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  const color = usePalette().text;

  return <Text style={[{ color }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 34,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
});
