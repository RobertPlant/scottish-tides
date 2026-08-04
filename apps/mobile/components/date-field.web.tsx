// Web date picker: the browser's native <input type="date"> — accessible, no
// dependency, opens the OS/browser calendar. (Native uses date-field.tsx.)

import type { ChangeEvent } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-theme-color';

export interface DateFieldProps {
  /** Selected calendar date, YYYY-MM-DD. */
  value: string;
  onChange: (ymd: string) => void;
  min?: string;
  max?: string;
}

export function DateField({ value, onChange, min, max }: DateFieldProps) {
  const palette = usePalette();
  const scheme = useColorScheme();
  return (
    <input
      type="date"
      // No visible <label> in the picker row, so name it explicitly — otherwise
      // this is an unlabelled form control on the web build.
      aria-label="Date"
      value={value}
      min={min}
      max={max}
      onChange={(e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
          onChange(e.target.value);
        }
      }}
      style={{
        appearance: 'none',
        backgroundColor: palette.surface,
        color: palette.text,
        border: `1px solid ${palette.border}`,
        borderRadius: 10,
        padding: '9px 12px',
        fontSize: 16,
        fontFamily: 'inherit',
        colorScheme: scheme,
      }}
    />
  );
}
