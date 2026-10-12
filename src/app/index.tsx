import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SignInScreen from '@/components/sign-in-screen';
import { Brand } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function IndexScreen() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.green} size="large" />
        </View>
      </SafeAreaView>
    );
  }
  if (session) return <Redirect href="/(tabs)" />;
  return <SignInScreen />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
