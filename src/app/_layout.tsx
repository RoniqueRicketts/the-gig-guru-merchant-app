import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { LockScreen, PrivacyCover } from '@/components/lock-screen';
import { ToastProvider } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { AppLockProvider, useAppLock } from '@/lib/app-lock';
import { AuthProvider, useAuth } from '@/lib/auth';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppLockProvider>
        <ToastProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </ToastProvider>
      </AppLockProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const { locked, obscured } = useAppLock();
  const signedIn = !!session;

  useEffect(() => {
    if (!loading) void SplashScreen.hideAsync();
  }, [loading]);

  // Keep the native splash up until we know whether a secure session exists.
  if (loading) return null;
  if (locked) return <LockScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: Colors.background },
          headerShadowVisible: false,
          headerTintColor: Colors.primary,
          headerTitleStyle: { color: Colors.text, fontWeight: '700' },
          headerStyle: { backgroundColor: Colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ title: 'Reset password', presentation: 'modal' }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="create"
            options={{
              presentation: 'formSheet',
              sheetAllowedDetents: 'fitToContents',
              sheetGrabberVisible: true,
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
            }}
          />
          <Stack.Screen name="appointments/new" options={{ title: 'New booking', presentation: 'modal' }} />
          <Stack.Screen name="appointments/[id]" options={{ title: 'Booking' }} />
          <Stack.Screen name="invoices/new" options={{ title: 'New invoice', presentation: 'modal' }} />
          <Stack.Screen name="invoices/[id]" options={{ title: 'Invoice' }} />
          <Stack.Screen name="orders/[id]" options={{ title: 'Order' }} />
          <Stack.Screen name="billing" options={{ title: 'Billing history' }} />
          <Stack.Screen name="catalog" options={{ title: 'Catalog' }} />
          <Stack.Screen name="services/edit" options={{ title: 'Service', presentation: 'modal' }} />
          <Stack.Screen name="products/edit" options={{ title: 'Product', presentation: 'modal' }} />
          <Stack.Screen name="branches/index" options={{ title: 'Locations' }} />
          <Stack.Screen name="branches/edit" options={{ title: 'Location', presentation: 'modal' }} />
          <Stack.Screen name="addresses/index" options={{ title: 'Addresses' }} />
          <Stack.Screen name="addresses/edit" options={{ title: 'Address', presentation: 'modal' }} />
          <Stack.Screen name="hours" options={{ title: 'Business hours' }} />
          <Stack.Screen name="company" options={{ title: 'Business profile' }} />
          <Stack.Screen name="security" options={{ title: 'Login & security' }} />
        </Stack.Protected>
      </Stack>
      {obscured && signedIn ? <PrivacyCover /> : null}
    </View>
  );
}
