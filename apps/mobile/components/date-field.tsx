// Native date picker: a button that opens the platform calendar
// (@react-native-community/datetimepicker). The web build uses date-field.web.tsx.

import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePalette } from '@/hooks/use-theme-color';

export interface DateFieldProps {
  /** Selected calendar date, YYYY-MM-DD. */
  value: string;
  onChange: (ymd: string) => void;
  min?: string;
  max?: string;
}

/** Local Date at noon for a YYYY-MM-DD (noon avoids any tz date-rollover). */
function ymdToLocalNoon(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

function localToYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DateField({ value, onChange, min, max }: DateFieldProps) {
  const palette = usePalette();
  const [show, setShow] = useState(false);

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    setShow(Platform.OS === 'ios' && event.type !== 'dismissed');
    if (event.type === 'set' && selected) {
      onChange(localToYmd(selected));
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setShow(true)}
        style={[styles.button, { borderColor: palette.border, backgroundColor: palette.surface }]}
      >
        <ThemedText style={{ color: palette.accent, fontWeight: '600' }}>📅 Pick a date</ThemedText>
      </Pressable>
      {show && (
        <DateTimePicker
          value={ymdToLocalNoon(value)}
          mode="date"
          display="default"
          minimumDate={min ? ymdToLocalNoon(min) : undefined}
          maximumDate={max ? ymdToLocalNoon(max) : undefined}
          onChange={handleChange}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
  },
});
