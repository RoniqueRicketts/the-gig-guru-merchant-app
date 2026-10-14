import { Redirect } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function TabLayout() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.canvas }}>
        <ActivityIndicator color={Brand.green} size="large" />
      </View>
    );
  }
  if (!session) return <Redirect href="/" />;

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.slot} />
      <TabList style={styles.hiddenRoutes}>
        <TabTrigger name="home" href="/" />
        <TabTrigger name="invoices" href="/(tabs)/invoices" />
        <TabTrigger name="calendar" href="/(tabs)/manage" />
        <TabTrigger name="items" href="/(tabs)/products" />
        <TabTrigger name="more" href="/(tabs)/profile" />
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Brand.canvas },
  slot: { flex: 1, backgroundColor: Brand.canvas },
  hiddenRoutes: { display: 'none' },
});
