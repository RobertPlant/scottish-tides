// Web date picker: the browser's native <input type="date"> — accessible, no
// dependency, opens the OS/browser calendar. (Native uses date-field.tsx.)

import type { ChangeEvent } from 'react';

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
  return (
    <input
      type="date"
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
        colorScheme: palette.background === '#06121d' ? 'dark' : 'light',
      }}
    />
  );
}
