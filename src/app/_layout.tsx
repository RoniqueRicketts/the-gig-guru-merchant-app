import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LockScreen, PrivacyCover } from '@/components/lock-screen';
import { stackScreenOptions } from '@/components/navigation';
import { ErrorState, ToastProvider } from '@/components/ui';
import { Colors, NavigationTheme } from '@/constants/theme';
import { AppLockProvider, useAppLock } from '@/lib/app-lock';
import { AuthProvider, useAuth } from '@/lib/auth';
import { CatalogProvider, useCatalogState } from '@/lib/catalog';

void SplashScreen.preventAutoHideAsync();

/** Deep links (notifications, URLs) open on top of the tabs, so the back button always has somewhere to go. */
export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  return (
    <ThemeProvider value={NavigationTheme}>
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
    </ThemeProvider>
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
      <Stack screenOptions={stackScreenOptions}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="reset-password" options={{ title: 'Reset password', presentation: 'modal' }} />
          <Stack.Screen name="sign-up" options={{ title: 'Create account', presentation: 'modal' }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn}>
          {/* Every signed-in screen lives inside a tab's stack (see (tabs)/(home,calendar,sales,account)/_layout.tsx) so the tab bar is always visible. */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      {obscured && signedIn ? <PrivacyCover /> : null}
    </View>
  );
}
