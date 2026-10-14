import { router, useSegments } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/components/ui';
import { Brand } from '@/constants/theme';

const tabs: { name: string; label: string; icon: AppIconName; href: '/' | '/(tabs)/invoices' | '/(tabs)/manage' | '/(tabs)/products' | '/(tabs)/profile' }[] = [
  { name: 'home', label: 'Home', icon: 'house.fill', href: '/' },
  { name: 'invoices', label: 'Invoices', icon: 'doc.text.fill', href: '/(tabs)/invoices' },
  { name: 'calendar', label: 'Calendar', icon: 'calendar', href: '/(tabs)/manage' },
  { name: 'items', label: 'Items', icon: 'shippingbox.fill', href: '/(tabs)/products' },
  { name: 'more', label: 'More', icon: 'person.crop.circle', href: '/(tabs)/profile' },
];

export function AppBottomNavigation() {
  const segments = useSegments();
  const activeTab = getActiveTab(segments);

  return (
    <SafeAreaView edges={['bottom']} style={styles.dock}>
      <View style={styles.pill}>
        {tabs.map((tab) => {
          const isFocused = tab.name === activeTab;
          const color = isFocused ? Brand.green : Brand.deep;
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              onPress={() => router.replace(tab.href)}
              style={({ pressed }) => [
                styles.tabButton,
                isFocused && styles.selectedTab,
                pressed && styles.pressedTab,
              ]}>
              <AppIcon name={tab.icon} color={color} size={21} />
              <Text style={[styles.tabLabel, { color }, isFocused && styles.selectedLabel]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function getActiveTab(segments: string[]) {
  const [root, child] = segments;
  if (root === '(tabs)') {
    if (child === 'invoices') return 'invoices';
    if (child === 'manage') return 'calendar';
    if (child === 'products') return 'items';
    if (child === 'profile') return 'more';
    return 'home';
  }
  if (root === 'invoices') return 'invoices';
  if (root === 'products') return 'items';
  if (root === 'appointments' || root === 'schedules') return 'calendar';
  return 'more';
}

const styles = StyleSheet.create({
  dock: { backgroundColor: 'transparent', paddingHorizontal: 18, paddingTop: 6 },
  pill: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Brand.white,
    borderRadius: 34,
    padding: 5,
    shadowColor: '#172516',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 13,
    elevation: 7,
  },
  tabButton: {
    flex: 1,
    minWidth: 0,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
    gap: 1,
  },
  selectedTab: { backgroundColor: '#F0F1F4' },
  pressedTab: { opacity: 0.68 },
  tabLabel: { fontSize: 9, lineHeight: 12, fontWeight: '500' },
  selectedLabel: { fontWeight: '700' },
});
