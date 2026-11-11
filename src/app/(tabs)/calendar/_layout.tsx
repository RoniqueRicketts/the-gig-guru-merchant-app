import { Stack } from 'expo-router';

import { HeaderButton, stackScreenOptions, tabRootOptions } from '@/components/navigation';

export default function CalendarStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          ...tabRootOptions,
          title: 'Calendar',
          headerRight: () => <HeaderButton href="/appointments/new" icon="plus" label="New booking" />,
        }}
      />
    </Stack>
  );
}
