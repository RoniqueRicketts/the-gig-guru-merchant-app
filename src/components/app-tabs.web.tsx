import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { forwardRef, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/icon';
import { Colors } from '@/constants/theme';

/** Web has no native tab bar; this mirrors the phone tab bar so the layout stays familiar. */
export default function AppTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        <TabTrigger asChild href="/" name="(home)">
          <TabButton icon="home.fill" label="Today" />
        </TabTrigger>
        <TabTrigger asChild href="/calendar" name="(calendar)">
          <TabButton icon="calendar" label="Calendar" />
        </TabTrigger>
        <TabTrigger asChild href="/sales" name="(sales)">
          <TabButton icon="sales.fill" label="Sales" />
        </TabTrigger>
        <TabTrigger asChild href="/account" name="(account)">
          <TabButton icon="account.fill" label="Account" />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

type TabButtonProps = TabTriggerSlotProps & { icon: IconName; label: string };

const TabButton = forwardRef<ComponentRef<typeof Pressable>, TabButtonProps>(function TabButton(
  { icon, label, isFocused, ...props },
  ref
) {
  const color = isFocused ? Colors.primary : Colors.textMuted;
  return (
    <Pressable {...props} accessibilityLabel={label} accessibilityRole="tab" ref={ref} style={styles.tab}>
      <View style={[styles.pill, isFocused && styles.pillActive]}>
        <Icon color={color} name={icon} size={24} />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  slot: { flex: 1 },
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 2 },
  pill: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pillActive: { backgroundColor: Colors.tint },
  label: { fontSize: 11, fontWeight: '600' },
});
