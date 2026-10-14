import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Brand } from '@/constants/theme';

type AppSymbolName = React.ComponentProps<typeof SymbolView>['name'];

const symbols = {
  plus: { ios: 'plus', android: 'add', web: 'add' },
  'house.fill': { ios: 'house.fill', android: 'home', web: 'home' },
  'chevron.left': { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  'chevron.right': { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  calendar: { ios: 'calendar', android: 'calendar_today', web: 'calendar_today' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  'shippingbox.fill': { ios: 'shippingbox.fill', android: 'inventory_2', web: 'inventory_2' },
  'clock.fill': { ios: 'clock.fill', android: 'schedule', web: 'schedule' },
  'mappin.and.ellipse': { ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' },
  mappin: { ios: 'mappin', android: 'location_on', web: 'location_on' },
  'building.2.fill': { ios: 'building.2.fill', android: 'business', web: 'business' },
  'lock.fill': { ios: 'lock.fill', android: 'lock', web: 'lock' },
  'hand.raised.fill': { ios: 'hand.raised.fill', android: 'shield', web: 'shield' },
  'bag.fill': { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
  'person.crop.circle.fill': { ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' },
  'person.crop.circle': { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  'info.circle': { ios: 'info.circle', android: 'info', web: 'info' },
  'arrow.up.right': { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' },
  'doc.text.fill': { ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' },
} satisfies Record<string, AppSymbolName>;

export type AppIconName = keyof typeof symbols;

export function AppIcon({ name, color, size = 20 }: { name: AppIconName; color: string; size?: number }) {
  return <SymbolView name={symbols[name]} tintColor={color} size={size} />;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  trailing,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderCopy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.pageTitle}>{title}</Text>
        {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
      </View>
      {trailing}
    </View>
  );
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'quiet';
  disabled?: boolean;
  loading?: boolean;
  icon?: AppIconName;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        (disabled || loading) && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? Brand.white : Brand.deep} size="small" />
      ) : (
        <>
          {icon ? (
            <AppIcon name={icon} color={variant === 'primary' ? Brand.white : Brand.deep} size={17} />
          ) : null}
          <Text
            style={[
              styles.buttonText,
              variant === 'primary' && styles.buttonTextPrimary,
              variant === 'danger' && styles.buttonTextDanger,
            ]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function FormField({
  label,
  hint,
  multiline = false,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        placeholderTextColor="#879787"
        style={[styles.input, multiline && styles.multiline, props.style]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function Surface({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function InlineNotice({
  message,
  tone = 'error',
}: {
  message: string;
  tone?: 'error' | 'info';
}) {
  return (
    <View style={[styles.notice, tone === 'error' ? styles.noticeError : styles.noticeInfo]}>
      <Text style={styles.noticeText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
  },
  pageHeaderCopy: { flex: 1 },
  eyebrow: {
    color: Brand.green,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 5,
  },
  pageTitle: { color: Brand.deep, fontSize: 29, fontWeight: '800', letterSpacing: -0.7 },
  pageSubtitle: { color: Brand.muted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  button: {
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  button_primary: { backgroundColor: Brand.green },
  button_secondary: { backgroundColor: Brand.softGreen, borderWidth: 1, borderColor: Brand.border },
  button_danger: { backgroundColor: '#FDECEC' },
  button_quiet: { backgroundColor: 'transparent', paddingHorizontal: 10 },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: Brand.deep, fontSize: 14, fontWeight: '700' },
  buttonTextPrimary: { color: Brand.white },
  buttonTextDanger: { color: Brand.danger },
  pressed: { opacity: 0.72 },
  field: { gap: 7, marginBottom: 15 },
  fieldLabel: { color: Brand.deep, fontSize: 13, fontWeight: '700' },
  input: {
    minHeight: 50,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: Brand.white,
    color: Brand.deep,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  multiline: { minHeight: 90, paddingTop: 13 },
  fieldHint: { color: Brand.muted, fontSize: 12, lineHeight: 17 },
  surface: {
    backgroundColor: Brand.white,
    borderColor: Brand.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
  },
  notice: { borderRadius: 13, padding: 13, marginBottom: 14 },
  noticeError: { backgroundColor: '#FDECEC' },
  noticeInfo: { backgroundColor: Brand.softGreen },
  noticeText: { color: Brand.deep, fontSize: 13, lineHeight: 19 },
});
