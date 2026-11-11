import { forwardRef, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { dayKey, isoWithOffset } from '@/lib/format';
import { haptic } from '@/lib/haptics';

// ---------------------------------------------------------------- Text input

type FieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  icon?: IconName;
  /** Shows a show/hide toggle; implies secure entry. */
  password?: boolean;
};

export const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, hint, icon, password = false, multiline, style, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          multiline && styles.inputWrapMultiline,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}>
        {icon ? <Icon color={Colors.textFaint} name={icon} size={18} /> : null}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          autoCorrect={!password && props.keyboardType !== 'email-address'}
          maxLength={props.maxLength ?? (multiline ? 2000 : 120)}
          multiline={multiline}
          placeholderTextColor={Colors.textFaint}
          secureTextEntry={password && !revealed}
          spellCheck={!password}
          style={[styles.input, multiline && styles.inputMultiline, style]}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
          onBlur={(event) => {
            setFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            props.onFocus?.(event);
          }}
        />
        {password ? (
          <Pressable
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setRevealed((value) => !value)}>
            <Icon color={Colors.textMuted} name={revealed ? 'eye.slash' : 'eye'} size={18} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

// ---------------------------------------------------------------- Chip choice (short option lists)

export function ChoiceChips<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label?: string;
  options: { value: T; label: string; color?: string }[];
  value: T | null;
  onChange: (value: T) => void;
  error?: string | null;
}) {
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.choiceWrap}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={option.value}
              onPress={() => {
                haptic.select();
                onChange(option.value);
              }}
              style={[styles.choice, selected && styles.choiceSelected]}>
              {option.color ? <View style={[styles.swatch, { backgroundColor: option.color }]} /> : null}
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function MultiChoiceChips({
  label,
  options,
  values,
  onChange,
  error,
  hint,
}: {
  label: string;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  error?: string | null;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              key={option.value}
              onPress={() => {
                haptic.select();
                onChange(selected ? values.filter((value) => value !== option.value) : [...values, option.value]);
              }}
              style={[styles.choice, selected && styles.choiceSelected]}>
              {selected ? <Icon color={Colors.white} name="check" size={14} /> : null}
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------- Select (long option lists in a sheet)

export type SelectOption = { value: string; label: string; detail?: string };

export function Select({
  label,
  placeholder = 'Choose',
  options,
  value,
  onChange,
  error,
  emptyText = 'Nothing to choose from yet.',
  loading = false,
}: {
  label: string;
  placeholder?: string;
  options: SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  error?: string | null;
  emptyText?: string;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? options.filter((option) => `${option.label} ${option.detail ?? ''}`.toLowerCase().includes(term)) : options;
  }, [options, query]);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityHint="Opens a list of options"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityRole="button"
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        style={({ pressed }) => [styles.inputWrap, !!error && styles.inputError, pressed && { backgroundColor: Colors.surface }]}>
        <Text numberOfLines={1} style={[styles.selectText, !selected && { color: Colors.textFaint }]}>
          {loading ? 'Loading…' : selected?.label ?? placeholder}
        </Text>
        <Icon color={Colors.textMuted} name="chevron.down" size={16} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="pageSheet" visible={open}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={Type.title}>{label}</Text>
            <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={10} onPress={() => setOpen(false)}>
              <Icon color={Colors.text} name="close" size={20} />
            </Pressable>
          </View>
          {options.length > 8 ? (
            <View style={[styles.inputWrap, styles.sheetSearch]}>
              <Icon color={Colors.textFaint} name="search" size={16} />
              <TextInput
                accessibilityLabel="Search options"
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder="Search"
                placeholderTextColor={Colors.textFaint}
                style={styles.input}
                value={query}
              />
            </View>
          ) : null}
          <FlatList
            data={filtered}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.value}
            ListEmptyComponent={<Text style={[Type.caption, styles.sheetEmpty]}>{loading ? 'Loading…' : emptyText}</Text>}
            renderItem={({ item }) => {
              const isSelected = item.value === value;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => {
                    haptic.select();
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: Colors.surface }]}>
                  <View style={styles.flex}>
                    <Text style={[styles.optionText, isSelected && { color: Colors.primary }]}>{item.label}</Text>
                    {item.detail ? <Text style={Type.caption}>{item.detail}</Text> : null}
                  </View>
                  {isSelected ? <Icon color={Colors.primary} name="check" size={18} /> : null}
                </Pressable>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ---------------------------------------------------------------- Switch row

export function SwitchRow({ label, detail, value, onChange, disabled }: { label: string; detail?: string; value: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <Text style={styles.switchLabel}>{label}</Text>
        {detail ? <Text style={Type.caption}>{detail}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={(next) => {
          haptic.select();
          onChange(next);
        }}
        thumbColor={Colors.white}
        trackColor={{ false: Colors.border, true: Colors.primary }}
        value={value}
      />
    </View>
  );
}

// ---------------------------------------------------------------- Stepper

export function Stepper({ value, onChange, min = 1, max = 999, label }: { value: number; onChange: (value: number) => void; min?: number; max?: number; label: string }) {
  return (
    <View accessibilityLabel={`${label}: ${value}`} style={styles.stepper}>
      <Pressable
        accessibilityLabel={`Decrease ${label}`}
        accessibilityRole="button"
        disabled={value <= min}
        hitSlop={6}
        onPress={() => {
          haptic.select();
          onChange(Math.max(min, value - 1));
        }}
        style={[styles.stepperButton, value <= min && { opacity: 0.4 }]}>
        <Text style={styles.stepperSymbol}>−</Text>
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable
        accessibilityLabel={`Increase ${label}`}
        accessibilityRole="button"
        disabled={value >= max}
        hitSlop={6}
        onPress={() => {
          haptic.select();
          onChange(Math.min(max, value + 1));
        }}
        style={[styles.stepperButton, value >= max && { opacity: 0.4 }]}>
        <Text style={styles.stepperSymbol}>+</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------- Tap-only date + time picking

export function DayPicker({ value, onChange, days = 21, label = 'Day' }: { value: string; onChange: (key: string) => void; days?: number; label?: string }) {
  const options = useMemo(() => {
    const today = new Date();
    return Array.from({ length: days }, (_, index) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + index));
  }, [days]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView contentContainerStyle={styles.dayRow} horizontal showsHorizontalScrollIndicator={false} style={styles.bleed}>
        {options.map((date, index) => {
          const key = dayKey(date);
          const selected = key === value;
          return (
            <Pressable
              accessibilityLabel={date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={key}
              onPress={() => {
                haptic.select();
                onChange(key);
              }}
              style={[styles.dayChip, selected && styles.dayChipSelected]}>
              <Text style={[styles.dayChipWeek, selected && styles.onDark]}>
                {index === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' })}
              </Text>
              <Text style={[styles.dayChipNumber, selected && styles.onDark]}>{date.getDate()}</Text>
              <Text style={[styles.dayChipWeek, selected && styles.onDark]}>{date.toLocaleDateString(undefined, { month: 'short' })}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** "HH:mm" slots between open and close at the given step, hiding times already past today. */
export function buildSlots(day: string, open = '07:00', close = '21:00', stepMinutes = 30): string[] {
  const [openH, openM] = open.split(':').map(Number);
  const [closeH, closeM] = close.split(':').map(Number);
  const [year, month, date] = day.split('-').map(Number);
  const now = Date.now();
  const slots: string[] = [];
  for (let minutes = openH * 60 + openM; minutes < closeH * 60 + closeM; minutes += stepMinutes) {
    const slot = new Date(year, month - 1, date, Math.floor(minutes / 60), minutes % 60);
    if (slot.getTime() > now + 5 * 60_000) {
      slots.push(`${String(slot.getHours()).padStart(2, '0')}:${String(slot.getMinutes()).padStart(2, '0')}`);
    }
  }
  return slots;
}

export function TimeSlots({ slots, value, onChange, label = 'Time' }: { slots: string[]; value: string | null; onChange: (slot: string) => void; label?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {slots.length === 0 ? (
        <Text style={Type.caption}>No times left on this day. Pick another day.</Text>
      ) : (
        <View style={styles.choiceWrap}>
          {slots.map((slot) => {
            const selected = slot === value;
            const [hours, minutes] = slot.split(':').map(Number);
            const display = new Date(2000, 0, 1, hours, minutes).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                key={slot}
                onPress={() => {
                  haptic.select();
                  onChange(slot);
                }}
                style={[styles.slot, selected && styles.choiceSelected]}>
                <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{display}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** Local day + "HH:mm" → ISO 8601 string with the device's timezone offset (API requirement). */
export function toOffsetIso(day: string, time: string, addMinutes = 0): string {
  const [year, month, date] = day.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return isoWithOffset(new Date(year, month - 1, date, hours, minutes + addMinutes));
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  onDark: { color: Colors.white },
  bleed: { marginHorizontal: -Spacing.lg },
  field: { marginBottom: Spacing.lg },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textMuted, marginBottom: 6, marginLeft: Spacing.xs },
  inputWrap: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    paddingHorizontal: Spacing.md,
  },
  inputWrapMultiline: { alignItems: 'flex-start', paddingVertical: Spacing.sm },
  inputFocused: { borderColor: Colors.primary, borderWidth: 1.5 },
  inputError: { borderColor: Colors.danger },
  input: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 12 },
  inputMultiline: { minHeight: 96 },
  error: { color: Colors.danger, fontSize: 13, marginTop: 6 },
  hint: { color: Colors.textMuted, fontSize: 13, marginTop: 6 },
  selectText: { flex: 1, fontSize: 16, color: Colors.text },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  choice: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  choiceSelected: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  choiceText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  choiceTextSelected: { color: Colors.white },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  sheet: { flex: 1, backgroundColor: Colors.card },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  sheetSearch: { marginHorizontal: Spacing.lg, marginBottom: Spacing.sm, minHeight: 44, backgroundColor: Colors.fill, borderColor: 'transparent' },
  sheetEmpty: { textAlign: 'center', padding: Spacing.xxl },
  option: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  optionText: { fontSize: 16, color: Colors.text },
  switchRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  switchLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepperButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  stepperSymbol: { fontSize: 18, fontWeight: '700', color: Colors.text },
  stepperValue: { minWidth: 24, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.text },
  dayRow: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  dayChip: { width: 64, paddingVertical: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, alignItems: 'center' },
  dayChipSelected: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  dayChipWeek: { fontSize: 11, fontWeight: '600', color: Colors.textMuted },
  dayChipNumber: { fontSize: 20, fontWeight: '800', color: Colors.text, marginVertical: 2 },
  slot: { minWidth: 92, minHeight: 40, paddingHorizontal: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
});
