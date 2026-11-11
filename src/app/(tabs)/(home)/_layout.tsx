import { Stack } from 'expo-router';

import { HeaderButton, stackScreenOptions, tabRootOptions } from '@/components/navigation';

export default function HomeStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="index"
        options={{
          ...tabRootOptions,
          title: 'Today',
          headerRight: () => <HeaderButton href="/create" icon="plus" label="Create something new" />,
        }}
      />
    </Stack>
  );
}
