import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PasswordChecklist } from '@/components/password-checklist';
import { Banner, Button, Field } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { isEmail, isStrongPassword, safeMessage } from '@/lib/security';

export default function SignInScreen() {
  const { signIn, challenge, completeChallenge, cancelChallenge } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    setError(null);
    if (challenge) {
      if (!isStrongPassword(newPassword)) return setError('Choose a password that meets every requirement.');
    } else {
      if (!isEmail(email)) return setError('Enter a valid email address.');
      if (!password) return setError('Enter your password.');
    }
    setWorking(true);
    try {
      if (challenge) await completeChallenge(newPassword);
      else await signIn(email, password);
      haptic.success();
    } catch (cause) {
      haptic.error();
      setError(safeMessage(cause, 'Unable to sign in. Please try again.'));
      setPassword('');
    } finally {
      setWorking(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <Image accessibilityLabel="GigGuru" contentFit="contain" source={require('@/assets/images/white-logo.png')} style={styles.logo} />
        <Text style={styles.brand}>GigGuru</Text>
        <Text style={styles.tagline}>Run your business in a tap.</Text>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheet}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={Type.title}>{challenge ? 'Set a new password' : 'Sign in'}</Text>
          <Text style={[Type.caption, styles.lead]}>
            {challenge ? 'For your security, choose a new password to finish signing in.' : 'Welcome back. Sign in to your merchant account.'}
          </Text>

          {error ? <Banner message={error} /> : null}

          {challenge ? (
            <>
              <Field
                autoCapitalize="none"
                autoComplete="new-password"
                label="New password"
                onChangeText={setNewPassword}
                onSubmitEditing={() => void submit()}
                password
                returnKeyType="go"
                textContentType="newPassword"
                value={newPassword}
              />
              <PasswordChecklist password={newPassword} />
            </>
          ) : (
            <>
              <Field
                autoCapitalize="none"
                autoComplete="email"
                icon="mail"
                inputMode="email"
                keyboardType="email-address"
                label="Email"
                maxLength={254}
                onChangeText={setEmail}
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="you@business.com"
                returnKeyType="next"
                submitBehavior="submit"
                textContentType="username"
                value={email}
              />
              <Field
                ref={passwordRef}
                autoCapitalize="none"
                autoComplete="current-password"
                icon="lock"
                label="Password"
                maxLength={256}
                onChangeText={setPassword}
                onSubmitEditing={() => void submit()}
                password
                returnKeyType="go"
                textContentType="password"
                value={password}
              />
            </>
          )}

          <Button label={challenge ? 'Save and continue' : 'Sign in'} loading={working} onPress={() => void submit()} variant="dark" />

          {challenge ? (
            <Button label="Back to sign in" onPress={cancelChallenge} style={styles.secondary} variant="ghost" />
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/reset-password', params: email.trim() ? { email: email.trim() } : {} })}
              style={styles.forgot}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          )}

          {!challenge ? (
            <View style={styles.signUp}>
              <Text style={styles.signUpText}>New to GigGuru?</Text>
              <Button label="Create a business account" onPress={() => router.push('/sign-up')} size="md" variant="secondary" />
            </View>
          ) : null}

          <Text style={styles.note}>Protected with encrypted sign-in. We never store your password on this device.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.deep },
  hero: { alignItems: 'center', paddingTop: Spacing.xxxl, paddingBottom: Spacing.xxxl },
  logo: { width: 64, height: 64 },
  brand: { color: Colors.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginTop: Spacing.md },
  tagline: { color: Colors.accent, fontSize: 15, fontWeight: '600', marginTop: Spacing.xs },
  sheet: { flex: 1, backgroundColor: Colors.background, borderTopLeftRadius: Radius.xl + 6, borderTopRightRadius: Radius.xl + 6 },
  form: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: Spacing.xxl, paddingBottom: Spacing.xxxl },
  lead: { marginTop: Spacing.xs, marginBottom: Spacing.xl },
  secondary: { marginTop: Spacing.sm },
  forgot: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.md, marginTop: Spacing.sm },
  forgotText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  signUp: { marginTop: Spacing.xl, paddingTop: Spacing.xl, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, gap: Spacing.sm },
  signUpText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
  note: { color: Colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 17 },
});
