import { router, Tabs } from 'expo-router';
import { StyleSheet, type ColorValue } from 'react-native';

import { Icon, type IconName } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { haptic } from '@/lib/haptics';

function tabIcon(outline: IconName, filled: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return <Icon color={String(color)} name={focused ? filled : outline} size={25} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.select() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.ink,
        tabBarInactiveTintColor: Colors.textFaint,
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        sceneStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home.fill') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', tabBarIcon: tabIcon('calendar', 'calendar') }} />
      <Tabs.Screen
        name="create"
        listeners={{
          // The Create tab is an action, not a destination: it opens the quick-create sheet.
          tabPress: (event) => {
            event.preventDefault();
            haptic.tap();
            router.push('/create');
          },
        }}
        options={{
          title: 'Create',
          tabBarAccessibilityLabel: 'Create something new',
          tabBarIcon: () => <Icon color={Colors.primary} name="plus.square.fill" size={30} />,
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen name="sales" options={{ title: 'Sales', tabBarIcon: tabIcon('sales', 'sales.fill') }} />
      <Tabs.Screen name="account" options={{ title: 'Account', tabBarIcon: tabIcon('account', 'account.fill') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Colors.background,
    borderTopColor: Colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  label: { fontSize: 11, fontWeight: '600' },
});
