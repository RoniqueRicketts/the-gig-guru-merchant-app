import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

/**
 * Platform tab bar: UITabBar on iOS (Liquid Glass on iOS 26), Material 3 navigation bar on Android.
 * Each tab hosts its own native Stack so it keeps its history, large title and scroll-to-top.
 */
export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Colors.card}
      iconColor={{ default: Colors.textMuted, selected: Colors.primary }}
      indicatorColor={Colors.tint}
      labelStyle={{ default: { color: Colors.textMuted }, selected: { color: Colors.primary } }}
      rippleColor={Colors.ripple}
      tintColor={Colors.primary}>
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="home" sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="calendar">
        <NativeTabs.Trigger.Label>Calendar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="calendar_month" sf="calendar" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="sales">
        <NativeTabs.Trigger.Label>Sales</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon md="bar_chart" sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          md="account_circle"
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
