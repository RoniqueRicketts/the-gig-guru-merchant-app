import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Colors, HitTarget, MaxContentWidth, Radius, Spacing, Type } from '@/constants/theme';
import { initials, statusLabel, statusTone, type Tone } from '@/lib/format';
import { haptic } from '@/lib/haptics';

// ---------------------------------------------------------------- Layout

export function Screen({
  children,
  scroll = true,
  refreshControl,
  edges = ['top', 'left', 'right'],
  footer,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  edges?: Edge[];
  /** Pinned bottom area, e.g. a primary action button. */
  footer?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView edges={edges} style={styles.screen}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, contentStyle]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fixedContent, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

export function LargeHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.header}>
      <View style={styles.flex}>
        <Text accessibilityRole="header" style={Type.largeTitle}>{title}</Text>
        {subtitle ? <Text style={[Type.caption, styles.headerSubtitle]}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.headerRight}>{right}</View> : null}
    </View>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <Text accessibilityRole="header" style={Type.headline}>{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accessibilityLabel?: string }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------- Buttons

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark';

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  size = 'lg',
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const palette = buttonPalette[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        size === 'md' && styles.buttonMd,
        { backgroundColor: pressed ? palette.pressed : palette.bg, borderColor: palette.border },
        inactive && styles.disabled,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} size="small" />
      ) : (
        <>
          {icon ? <Icon color={palette.fg} name={icon} size={size === 'md' ? 16 : 18} /> : null}
          <Text numberOfLines={1} style={[styles.buttonText, size === 'md' && styles.buttonTextMd, { color: palette.fg }]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const buttonPalette: Record<ButtonVariant, { bg: string; pressed: string; fg: string; border: string }> = {
  primary: { bg: Colors.primary, pressed: Colors.primaryPressed, fg: Colors.white, border: Colors.primary },
  dark: { bg: Colors.deep, pressed: Colors.ink, fg: Colors.white, border: Colors.deep },
  secondary: { bg: Colors.surface, pressed: Colors.border, fg: Colors.text, border: Colors.border },
  ghost: { bg: 'transparent', pressed: Colors.surface, fg: Colors.primary, border: 'transparent' },
  danger: { bg: Colors.dangerTint, pressed: '#F9D6D6', fg: Colors.danger, border: Colors.dangerTint },
};

export function IconButton({
  icon,
  onPress,
  label,
  variant = 'plain',
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  variant?: 'plain' | 'filled' | 'tinted';
}) {
  const filled = variant === 'filled';
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={6}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.iconButton,
        filled && { backgroundColor: Colors.primary },
        variant === 'tinted' && { backgroundColor: Colors.surface },
        pressed && styles.pressed,
      ]}>
      <Icon color={filled ? Colors.white : Colors.text} name={icon} size={20} />
    </Pressable>
  );
}

/** Big circular one-tap action with a caption, Instagram-highlights style. */
export function QuickAction({ icon, label, onPress, tone = 'default' }: { icon: IconName; label: string; onPress: () => void; tone?: 'default' | 'primary' }) {
  const primary = tone === 'primary';
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}>
      <View style={[styles.quickCircle, primary && styles.quickCirclePrimary]}>
        <Icon color={primary ? Colors.white : Colors.primary} name={icon} size={24} />
      </View>
      <Text numberOfLines={2} style={styles.quickLabel}>{label}</Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------- Lists

export function ListGroup({ children, title, style }: { children: ReactNode; title?: string; style?: StyleProp<ViewStyle> }) {
  const items = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={style}>
      {title ? <Text style={[Type.micro, styles.groupTitle]}>{title.toUpperCase()}</Text> : null}
      <View style={styles.group}>
        {items.map((child, index) => (
          <View key={index}>
            {index > 0 ? <View style={styles.separator} /> : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconColor = Colors.primary,
  leading,
  value,
  trailing,
  onPress,
  destructive = false,
  chevron = !!onPress,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: string;
  leading?: ReactNode;
  value?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  chevron?: boolean;
}) {
  const content = (
    <>
      {leading ?? (icon ? (
        <View style={[styles.rowIcon, destructive && { backgroundColor: Colors.dangerTint }]}>
          <Icon color={destructive ? Colors.danger : iconColor} name={icon} size={18} />
        </View>
      ) : null)}
      <View style={styles.flex}>
        <Text numberOfLines={1} style={[styles.rowTitle, destructive && { color: Colors.danger }]}>{title}</Text>
        {subtitle ? <Text numberOfLines={2} style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value ? <Text numberOfLines={1} style={styles.rowValue}>{value}</Text> : null}
      {trailing}
      {chevron ? <Icon color={Colors.textFaint} name="chevron.right" size={14} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surface }]}>
      {content}
    </Pressable>
  );
}

export function Avatar({ name, size = 44, dark = false }: { name: string; size?: number; dark?: boolean }) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }, dark && { backgroundColor: Colors.deep }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }, dark && { color: Colors.accent }]}>{initials(name)}</Text>
    </View>
  );
}

const toneColors: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: Colors.tint, fg: Colors.primary },
  warning: { bg: Colors.warningTint, fg: Colors.warning },
  danger: { bg: Colors.dangerTint, fg: Colors.danger },
  info: { bg: Colors.infoTint, fg: Colors.info },
  neutral: { bg: Colors.surface, fg: Colors.textMuted },
};

export function StatusBadge({ status, label }: { status: unknown; label?: string }) {
  const tone = toneColors[statusTone(status)];
  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <Text numberOfLines={1} style={[styles.badgeText, { color: tone.fg }]}>{label ?? statusLabel(status)}</Text>
    </View>
  );
}

// ---------------------------------------------------------------- Feedback

export function Banner({ message, tone = 'danger', icon }: { message: string; tone?: Tone; icon?: IconName }) {
  const colors = toneColors[tone];
  return (
    <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.banner, { backgroundColor: colors.bg }]}>
      <Icon color={colors.fg} name={icon ?? (tone === 'danger' ? 'warning' : 'info')} size={16} />
      <Text style={[styles.bannerText, { color: tone === 'danger' ? Colors.danger : Colors.text }]}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  message?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Icon color={Colors.primary} name={icon} size={28} /></View>
      <Text style={[Type.headline, styles.center]}>{title}</Text>
      {message ? <Text style={[Type.caption, styles.center, styles.emptyMessage]}>{message}</Text> : null}
      {action && onAction ? <Button label={action} onPress={onAction} size="md" style={styles.emptyButton} /> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const offline = /offline|reach|connection/i.test(message);
  return (
    <EmptyState
      action="Try again"
      icon={offline ? 'offline' : 'warning'}
      message={message}
      onAction={onRetry}
      title={offline ? "You're offline" : "Couldn't load this"}
    />
  );
}

/** Lightweight shimmer placeholders that match list-row geometry. */
export function SkeletonList({ count = 4 }: { count?: number }) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 650, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View accessibilityLabel="Loading" accessible style={styles.skeletonWrap}>
      {Array.from({ length: count }, (_, index) => (
        <Animated.View key={index} style={[styles.skeletonRow, { opacity }]}>
          <View style={styles.skeletonCircle} />
          <View style={styles.flex}>
            <View style={[styles.skeletonLine, { width: '62%' }]} />
            <View style={[styles.skeletonLine, { width: '38%', marginTop: 8 }]} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

export function LoadingFooter({ visible }: { visible: boolean }) {
  return visible ? <ActivityIndicator color={Colors.primary} style={styles.loadingFooter} /> : <View style={styles.listEnd} />;
}

// ---------------------------------------------------------------- Selection

/** Pill segmented control, like Instagram's profile tabs. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => {
              if (!selected) haptic.select();
              onChange(option.value);
            }}
            style={[styles.segment, selected && styles.segmentSelected]}>
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Horizontally scrolling filter chips, Amazon-style. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.chips} horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroller}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => {
              haptic.select();
              onChange(option.value);
            }}
            style={[styles.chip, selected && styles.chipSelected]}>
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  screen: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxxl },
  fixedContent: { flex: 1, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  footer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: Spacing.sm, paddingBottom: Spacing.lg, gap: Spacing.md },
  headerSubtitle: { marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.xxl, marginBottom: Spacing.md },
  sectionAction: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg },
  button: {
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  buttonMd: { minHeight: HitTarget, paddingHorizontal: Spacing.lg, borderRadius: Radius.md },
  buttonText: { fontSize: 16, fontWeight: '700' },
  buttonTextMd: { fontSize: 14 },
  iconButton: { width: HitTarget, height: HitTarget, borderRadius: HitTarget / 2, alignItems: 'center', justifyContent: 'center' },
  quickAction: { width: 76, alignItems: 'center', gap: 6 },
  quickCircle: { width: 62, height: 62, borderRadius: 31, backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center' },
  quickCirclePrimary: { backgroundColor: Colors.primary },
  quickLabel: { fontSize: 12, fontWeight: '500', color: Colors.text, textAlign: 'center' },
  groupTitle: { marginBottom: Spacing.sm, marginLeft: Spacing.xs },
  group: { backgroundColor: Colors.background, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 60 },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  rowIcon: { width: 32, height: 32, borderRadius: Radius.sm, backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  rowSubtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  rowValue: { fontSize: 15, color: Colors.textMuted, maxWidth: '45%' },
  avatar: { backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.primary, fontWeight: '800' },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  bannerText: { flex: 1, fontSize: 14, lineHeight: 20 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxxl, paddingHorizontal: Spacing.xxl },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  emptyMessage: { marginTop: Spacing.xs, lineHeight: 19 },
  emptyButton: { marginTop: Spacing.lg },
  skeletonWrap: { gap: Spacing.lg, paddingVertical: Spacing.md },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  skeletonCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.surface },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: Colors.surface },
  loadingFooter: { paddingVertical: Spacing.xl },
  listEnd: { height: Spacing.xxl },
  segmented: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 3, marginBottom: Spacing.md },
  segment: { flex: 1, minHeight: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { backgroundColor: Colors.background, shadowColor: '#001900', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  segmentText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  segmentTextSelected: { color: Colors.text },
  chipScroller: { flexGrow: 0, marginHorizontal: -Spacing.lg, marginBottom: Spacing.md },
  chips: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: Radius.pill, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  chipSelected: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  chipText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  chipTextSelected: { color: Colors.white },
});
