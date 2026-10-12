import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, FormField, InlineNotice, PageHeader } from '@/components/ui';
import { Brand } from '@/constants/theme';
import { request } from '@/lib/api';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError(null);
    if (!email.trim() || !code.trim() || !password) {
      setError('Enter your email, verification code and a new password.');
      return;
    }
    setWorking(true);
    try {
      await request('/auth/confirm-forget-password', {
        method: 'POST',
        body: { email: email.trim(), code: code.trim(), password },
        authenticated: false,
      });
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to reset your password.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <PageHeader eyebrow="ACCOUNT ACCESS" title="Reset password" subtitle="Use the code sent to your email." />
          <View style={styles.card}>
            {error ? <InlineNotice message={error} /> : null}
            {done ? <InlineNotice message="Your password has been updated. You can now sign in." tone="info" /> : null}
            <FormField autoCapitalize="none" keyboardType="email-address" label="Email address" onChangeText={setEmail} value={email} />
            <FormField autoCapitalize="none" label="Verification code" onChangeText={setCode} value={code} />
            <FormField autoCapitalize="none" label="New password" onChangeText={setPassword} secureTextEntry value={password} />
            <Text style={styles.hint}>At least 8 characters, with uppercase, lowercase, number and symbol.</Text>
            <AppButton
              label={done ? 'Return to sign in' : 'Save new password'}
              loading={working}
              onPress={() => (done ? router.replace('/') : void submit())}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: 500, alignSelf: 'center', padding: 22, paddingTop: 28 },
  card: { backgroundColor: Brand.white, borderRadius: 22, borderWidth: 1, borderColor: Brand.border, padding: 18 },
  hint: { color: Brand.muted, fontSize: 12, marginBottom: 16 },
});
