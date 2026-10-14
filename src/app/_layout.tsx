import { Redirect, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from '@/lib/auth';
import { Brand } from '@/constants/theme';
import { AppBottomNavigation } from '@/components/app-bottom-navigation';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const isPublicRoute = !segments[0] || segments[0] === 'reset-password';

  if (loading && !isPublicRoute) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.canvas }}><ActivityIndicator color={Brand.green} size="large" /></View>;
  }
  if (!loading && !session && !isPublicRoute) return <Redirect href="/" />;

  return (
    <View style={{ flex: 1, backgroundColor: Brand.canvas }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Brand.canvas } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="reset-password" options={{ presentation: 'modal' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="services" />
        <Stack.Screen name="addresses" />
        <Stack.Screen name="branches" />
        <Stack.Screen name="appointments" />
        <Stack.Screen name="invoices" />
        <Stack.Screen name="orders" />
        <Stack.Screen name="schedules" />
        <Stack.Screen name="company" />
      </Stack>
      {session && !isPublicRoute ? <AppBottomNavigation /> : null}
    </View>
  );
}
