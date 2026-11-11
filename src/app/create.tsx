import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

const actions: { icon: IconName; title: string; detail: string; href: Href }[] = [
  { icon: 'calendar', title: 'Booking', detail: 'Schedule a customer', href: '/appointments/new' },
  { icon: 'invoice', title: 'Invoice', detail: 'Bill and send in seconds', href: '/invoices/new' },
  { icon: 'service', title: 'Service', detail: 'Add to your menu', href: '/services/edit' },
  { icon: 'product', title: 'Product', detail: 'List an item for sale', href: '/products/edit' },
  { icon: 'person.add', title: 'Team member', detail: 'Add staff to your team', href: '/team/edit' },
  { icon: 'queue', title: 'Queue', detail: 'Open a walk-in line', href: '/queues/edit' },
];

/** Quick-create sheet opened from the center tab — every "new" flow is one tap away. */
export default function CreateSheet() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + Spacing.lg }]}>
      <Text accessibilityRole="header" style={[Type.title, styles.title]}>Create</Text>
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            accessibilityHint={action.detail}
            accessibilityLabel={`New ${action.title.toLowerCase()}`}
            accessibilityRole="button"
            key={action.title}
            onPress={() => {
              haptic.tap();
              router.replace(action.href);
            }}
            style={({ pressed }) => [styles.tile, pressed && styles.pressed]}>
            <View style={styles.iconWrap}><Icon color={Colors.primary} name={action.icon} size={24} /></View>
            <Text style={styles.tileTitle}>{action.title}</Text>
            <Text style={styles.tileDetail}>{action.detail}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl, backgroundColor: Colors.background },
  title: { marginBottom: Spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: { width: '47.5%', flexGrow: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, minHeight: 116 },
  pressed: { opacity: 0.7 },
  iconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  tileTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  tileDetail: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
});
