import { Stack } from 'expo-router';

import { stackScreenOptions, tabRootOptions } from '@/components/navigation';

export default function AccountStack() {
  return (
    <Stack screenOptions={stackScreenOptions}>
      <Stack.Screen name="index" options={{ ...tabRootOptions, title: 'Account' }} />
    </Stack>
  );
}
