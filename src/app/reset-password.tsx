import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PasswordChecklist } from '@/components/password-checklist';
import { Banner, Button, Field, Screen } from '@/components/ui';
import { Spacing, Type } from '@/constants/theme';
import { request } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { isEmail, isStrongPassword, safeMessage } from '@/lib/security';

type Step = 'email' | 'code' | 'done';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  // Only accept a well-formed email from the deep link; never trust arbitrary params.
  const [email, setEmail] = useState(() => (params.email && isEmail(params.email) ? params.email : ''));
  const [step, setStep] = useState<Step>('email');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    setError(null);
    if (!isEmail(email)) return setError('Enter a valid email address.');
    setWorking(true);
    try {
      await request('/auth/forget-password', { method: 'POST', body: { email: email.trim().toLowerCase() }, authenticated: false });
      setStep('code');
    } catch (cause) {
      setError(safeMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  const reset = async () => {
    setError(null);
    if (!/^\d{4,8}$/.test(code.trim())) return setError('Enter the verification code from your email.');
    if (!isStrongPassword(password)) return setError('Choose a password that meets every requirement.');
    setWorking(true);
    try {
      await request('/auth/confirm-forget-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase(), code: code.trim(), password },
        authenticated: false,
      });
      haptic.success();
      setPassword('');
      setStep('done');
    } catch (cause) {
      setError(safeMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      {step === 'email' ? (
        <>
          <Text style={[Type.caption, styles.lead]}>Enter your account email and we&apos;ll send you a verification code.</Text>
          {error ? <Banner message={error} /> : null}
          <Field
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
            keyboardType="email-address"
            label="Email"
            maxLength={254}
            onChangeText={setEmail}
            onSubmitEditing={() => void sendCode()}
            returnKeyType="send"
            value={email}
          />
          <Button label="Send code" loading={working} onPress={() => void sendCode()} />
        </>
      ) : step === 'code' ? (
        <>
          <Text style={[Type.caption, styles.lead]}>
            If an account exists for {email.trim()}, a code is on its way. Enter it below with your new password.
          </Text>
          {error ? <Banner message={error} /> : null}
          <Field
            autoComplete="one-time-code"
            keyboardType="number-pad"
            label="Verification code"
            maxLength={8}
            onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
            textContentType="oneTimeCode"
            value={code}
          />
          <Field autoCapitalize="none" autoComplete="new-password" label="New password" maxLength={256} onChangeText={setPassword} password textContentType="newPassword" value={password} />
          <PasswordChecklist password={password} />
          <Button label="Reset password" loading={working} onPress={() => void reset()} />
          <Button label="Resend code" onPress={() => void sendCode()} style={styles.secondary} variant="ghost" />
        </>
      ) : (
        <>
          <Banner icon="check.circle" message="Your password has been reset. Sign in with your new password." tone="success" />
          <Button label="Back to sign in" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: Spacing.lg, marginBottom: Spacing.xl, lineHeight: 19 },
  secondary: { marginTop: Spacing.sm },
});
