import { Stack } from 'expo-router';

import { HeaderButton, plainListOptions, stackScreenOptions, tabRootOptions } from '@/components/navigation';
import { Colors } from '@/constants/theme';

/**
 * Every tab's stack. Screens in this folder are shared routes: they exist once per tab, so a
 * screen pushed from a tab opens inside that tab's stack and the bottom tab bar stays visible.
 * Each tab's root screen lives in its own group: (home)/index, (calendar)/calendar, …
 */
export const unstable_settings = {
  home: { anchor: 'index' },
  calendar: { anchor: 'calendar' },
  sales: { anchor: 'sales' },
  account: { anchor: 'account' },
};

type TabGroup = '(home)' | '(calendar)' | '(sales)' | '(account)';

export default function TabStack({ segment }: { segment: TabGroup }) {
  return (
    <Stack screenOptions={stackScreenOptions}>
      {tabRootScreen(segment)}

      <Stack.Screen
        name="create"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          headerShown: false,
          contentStyle: { backgroundColor: Colors.card },
        }}
      />
      <Stack.Screen name="appointments/new" options={{ title: 'New booking', presentation: 'modal' }} />
      <Stack.Screen name="appointments/[id]" options={{ title: 'Booking' }} />
      <Stack.Screen name="invoices/new" options={{ title: 'New invoice', presentation: 'modal' }} />
      <Stack.Screen name="invoices/[id]" options={{ title: 'Invoice' }} />
      <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
      <Stack.Screen name="billing" options={{ title: 'Billing history' }} />
      <Stack.Screen name="catalog" options={{ ...plainListOptions, title: 'Catalog' }} />
      <Stack.Screen name="services/edit" options={{ title: 'Service', presentation: 'modal' }} />
      <Stack.Screen name="products/edit" options={{ title: 'Product', presentation: 'modal' }} />
      <Stack.Screen name="branches/index" options={{ title: 'Locations' }} />
      <Stack.Screen name="branches/edit" options={{ title: 'Location', presentation: 'modal' }} />
      <Stack.Screen name="addresses/index" options={{ title: 'Addresses' }} />
      <Stack.Screen name="addresses/edit" options={{ title: 'Address', presentation: 'modal' }} />
      <Stack.Screen name="hours" options={{ title: 'Business hours' }} />
      <Stack.Screen name="company" options={{ title: 'Business profile' }} />
      <Stack.Screen name="security" options={{ title: 'Login & security' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
      <Stack.Screen name="team/index" options={{ ...plainListOptions, title: 'Team' }} />
      <Stack.Screen name="team/edit" options={{ title: 'Team member', presentation: 'modal' }} />
      <Stack.Screen name="team/role" options={{ title: 'Role', presentation: 'modal' }} />
      <Stack.Screen name="queues/index" options={{ title: 'Queues' }} />
      <Stack.Screen name="queues/[id]" options={{ title: 'Queue' }} />
      <Stack.Screen name="queues/edit" options={{ title: 'Queue', presentation: 'modal' }} />
      <Stack.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Stack.Screen name="deliveries" options={{ title: 'Deliveries' }} />
      <Stack.Screen name="receipts/index" options={{ ...plainListOptions, title: 'Sales receipts' }} />
      <Stack.Screen name="receipts/[id]" options={{ title: 'Receipt' }} />
    </Stack>
  );
}

/**
 * The large-title root screen for whichever tab this stack belongs to. Called as a function (not
 * rendered as a component) because the Stack only accepts direct `Stack.Screen` children.
 */
function tabRootScreen(segment: TabGroup) {
  switch (segment) {
    case '(calendar)':
      return (
        <Stack.Screen
          name="calendar"
          options={{
            ...tabRootOptions,
            title: 'Calendar',
            headerRight: () => <HeaderButton href="/appointments/new" icon="plus" label="New booking" />,
          }}
        />
      );
    case '(sales)':
      return (
        <Stack.Screen
          name="sales"
          options={{
            ...tabRootOptions,
            ...plainListOptions,
            title: 'Sales',
            headerRight: () => <HeaderButton href="/invoices/new" icon="plus" label="New invoice" />,
          }}
        />
      );
    case '(account)':
      return <Stack.Screen name="account" options={{ ...tabRootOptions, title: 'Account' }} />;
    default:
      return (
        <Stack.Screen
          name="index"
          options={{
            ...tabRootOptions,
            title: 'Today',
            headerRight: () => <HeaderButton href="/create" icon="plus" label="Create something new" />,
          }}
        />
      );
  }
}
