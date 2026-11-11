import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockScreen, PrivacyCover } from '@/components/lock-screen';
import { ErrorState, ToastProvider } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { AppLockProvider, useAppLock } from '@/lib/app-lock';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CatalogProvider, useCatalogState } from '@/lib/catalog';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <CatalogProvider>
      <AuthProvider>
        <AppLockProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </ToastProvider>
        </AppLockProvider>
      </AuthProvider>
    </CatalogProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();
  const { locked, obscured } = useAppLock();
  // Option lists (categories, countries, statuses…) come from the API's GET /meta.
  const meta = useCatalogState();
  const signedIn = !!session;
  const settled = !loading && !meta.loading;

  useEffect(() => {
    if (settled) void SplashScreen.hideAsync();
  }, [settled]);

  // Keep the native splash up until the session and the API's catalog are both known.
  if (!meta.catalog) {
    if (meta.loading) {
      // Under the splash on launch; visible only while retrying after a failure.
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      );
    }
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', backgroundColor: Colors.background }}>
        <ErrorState message={meta.error ?? "We couldn't reach GigGuru."} onRetry={meta.retry} />
      </SafeAreaView>
    );
  }
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
          <Stack.Screen name="sign-up" options={{ title: 'Create account', presentation: 'modal' }} />
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
          <Stack.Screen name="team/index" options={{ title: 'Team' }} />
          <Stack.Screen name="team/edit" options={{ title: 'Team member', presentation: 'modal' }} />
          <Stack.Screen name="team/role" options={{ title: 'Role', presentation: 'modal' }} />
          <Stack.Screen name="queues/index" options={{ title: 'Queues' }} />
          <Stack.Screen name="queues/[id]" options={{ title: 'Queue' }} />
          <Stack.Screen name="queues/edit" options={{ title: 'Queue', presentation: 'modal' }} />
          <Stack.Screen name="attendance" options={{ title: 'Attendance' }} />
          <Stack.Screen name="deliveries" options={{ title: 'Deliveries' }} />
          <Stack.Screen name="receipts/index" options={{ title: 'Sales receipts' }} />
          <Stack.Screen name="receipts/[id]" options={{ title: 'Receipt' }} />
        </Stack.Protected>
      </Stack>
      {obscured && signedIn ? <PrivacyCover /> : null}
    </View>
  );
}
