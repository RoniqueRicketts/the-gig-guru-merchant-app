import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAppLock } from '@/lib/app-lock';
import { useAuth } from '@/lib/auth';

/** Full-screen gate shown when biometric app lock is on and the app needs unlocking. */
export function LockScreen() {
  const { unlock, reset } = useAppLock();
  const { signOut } = useAuth();

  const signOutAndReset = async () => {
    await signOut();
    reset();
  };

  useEffect(() => {
    void unlock();
  }, [unlock]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <Image accessibilityLabel="GigGuru" contentFit="contain" source={require('@/assets/images/white-logo.png')} style={styles.logo} />
        <Text style={styles.title}>GigGuru is locked</Text>
        <Text style={styles.subtitle}>Unlock to see your business.</Text>
      </View>
      <View style={styles.actions}>
        <Button icon="biometric" label="Unlock" onPress={() => void unlock()} variant="primary" />
        <Button label="Sign out" onPress={() => void signOutAndReset()} style={styles.signOut} variant="secondary" />
      </View>
    </SafeAreaView>
  );
}

/** Covers business data while the app is in the app switcher. */
export function PrivacyCover() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.root, styles.centered]}>
      <Image contentFit="contain" source={require('@/assets/images/white-logo.png')} style={styles.logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.deep },
  centered: { alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  logo: { width: 72, height: 72, marginBottom: Spacing.xl },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  subtitle: { color: '#B8CCB7', fontSize: 15, marginTop: Spacing.sm },
  actions: { padding: Spacing.xl, gap: Spacing.sm },
  signOut: { marginTop: Spacing.xs },
});
