import { Stack } from 'expo-router';

import { HeaderButton, plainListOptions, stackScreenOptions, tabRootOptions } from '@/components/navigation';

export default function SalesStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          ...tabRootOptions,
          ...plainListOptions,
          title: 'Sales',
          headerRight: () => <HeaderButton href="/invoices/new" icon="plus" label="New invoice" />,
        }}
      />
    </Stack>
  );
}
