import { Redirect, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, View } from 'react-native';

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
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Brand.green,
        tabBarInactiveTintColor: Brand.muted,
        tabBarStyle: { backgroundColor: Brand.white, borderTopColor: Brand.border, height: 63, paddingTop: 5 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} tintColor={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="manage"
        options={{
          title: 'Manage',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' }} tintColor={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }} tintColor={color} size={21} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' }} tintColor={color} size={21} />,
        }}
      />
    </Tabs>
  );
}
