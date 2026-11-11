import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { PasswordChecklist } from '@/components/password-checklist';
import { Banner, Button, Field, Screen, Segmented, Select } from '@/components/ui';
import { countryLabel, enumLabel } from '@/constants/enums';
import { useCatalog } from '@/lib/catalog';
import { Colors, Spacing, Type } from '@/constants/theme';
import { request } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { isE164, isEmail, isStrongPassword, normalizePhone, safeMessage } from '@/lib/security';

type Step = 'details' | 'code';

const businessTypeLabels: Record<string, string> = { Individual: 'An individual', Company: 'A company' };

/** Seconds before "Resend code" works again; the API allows 5 recovery requests per 15 minutes. */
const RESEND_COOLDOWN = 60;

export default function SignUpScreen() {
  const { signIn } = useAuth();
  const { countries, businessTypes } = useCatalog();
  const [step, setStep] = useState<Step>('details');
  const [fullname, setFullname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<string>(businessTypes.includes('Individual') ? 'Individual' : businessTypes[0]);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const cleanEmail = email.trim().toLowerCase();

  const register = async () => {
    const cleanPhone = normalizePhone(phone);
    const next: Record<string, string> = {};
    if (!fullname.trim()) next.fullname = 'Enter your full name.';
    if (!isEmail(email)) next.email = 'Enter a valid email address.';
    if (!isE164(cleanPhone)) next.phone = 'Use international format, e.g. +18765550123.';
    if (!country) next.country = 'Choose your country.';
    if (!isStrongPassword(password)) next.password = 'Choose a password that meets every requirement.';
    setErrors(next);
    setError(Object.keys(next).length ? 'Please fix the highlighted fields.' : null);
    if (Object.keys(next).length) return;

    setWorking(true);
    try {
      await request('/auth/sign-up', {
        method: 'POST',
        authenticated: false,
        body: { fullname: fullname.trim(), email: cleanEmail, country, business_type: businessType, telephone: cleanPhone, password },
      });
      haptic.success();
      setNotice(null);
      setCooldown(RESEND_COOLDOWN);
      setStep('code');
    } catch (cause) {
      haptic.error();
      setError(safeMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  const confirm = async () => {
    setError(null);
    if (!/^\d{4,8}$/.test(code.trim())) return setError('Enter the verification code from your email.');
    setWorking(true);
    try {
      await request('/auth/confirm-sign-up', { method: 'POST', authenticated: false, body: { email: cleanEmail, code: code.trim() } });
    } catch (cause) {
      haptic.error();
      setError(safeMessage(cause));
      setWorking(false);
      return;
    }
    // Confirmed: sign straight in so the merchant lands on Home without retyping anything.
    try {
      await signIn(cleanEmail, password);
      setPassword('');
      haptic.success();
    } catch (cause) {
      setPassword('');
      setWorking(false);
      setError(`Your account is confirmed. ${safeMessage(cause, 'Please sign in to continue.')}`);
    }
  };

  const resend = async () => {
    setError(null);
    setWorking(true);
    try {
      await request('/auth/resend-confirmation-code', { method: 'POST', authenticated: false, body: { email: cleanEmail } });
      setNotice('A new code is on its way.');
      setCooldown(RESEND_COOLDOWN);
    } catch (cause) {
      setError(safeMessage(cause));
    } finally {
      setWorking(false);
    }
  };

  if (step === 'code') {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <Text style={[Type.caption, styles.lead]}>
          We sent a verification code to {cleanEmail}. Enter it to activate your business account.
        </Text>
        {error ? <Banner message={error} /> : null}
        {notice && !error ? <Banner icon="check.circle" message={notice} tone="success" /> : null}
        <Field
          autoComplete="one-time-code"
          autoFocus
          keyboardType="number-pad"
          label="Verification code"
          maxLength={8}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          onSubmitEditing={() => void confirm()}
          textContentType="oneTimeCode"
          value={code}
        />
        <Button label="Verify and continue" loading={working} onPress={() => void confirm()} variant="dark" />
        <Button
          disabled={cooldown > 0 || working}
          label={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          onPress={() => void resend()}
          style={styles.secondary}
          variant="ghost"
        />
        <Button
          label="Use a different email"
          onPress={() => {
            setCode('');
            setError(null);
            setStep('details');
          }}
          variant="ghost"
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Text style={[Type.caption, styles.lead]}>Set up your GigGuru business in a minute. You can add locations, services and products after.</Text>
      {error ? <Banner message={error} /> : null}

      <Field autoCapitalize="words" autoComplete="name" error={errors.fullname} label="Your full name" onChangeText={setFullname} textContentType="name" value={fullname} />
      <Field
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
        inputMode="email"
        keyboardType="email-address"
        label="Email"
        maxLength={254}
        onChangeText={setEmail}
        placeholder="you@business.com"
        textContentType="emailAddress"
        value={email}
      />
      <Field autoComplete="tel" error={errors.phone} keyboardType="phone-pad" label="Phone" maxLength={20} onChangeText={setPhone} placeholder="+1 876 555 0123" textContentType="telephoneNumber" value={phone} />
      <Select error={errors.country} label="Country" onChange={setCountry} options={countries.map((value) => ({ value, label: countryLabel(value) }))} value={country} />

      <Text style={styles.label}>I work as</Text>
      <Segmented
        onChange={setBusinessType}
        options={businessTypes.map((value) => ({ value, label: businessTypeLabels[value] ?? enumLabel(value) }))}
        value={businessType}
      />

      <Field
        autoCapitalize="none"
        autoComplete="new-password"
        error={errors.password}
        label="Password"
        maxLength={256}
        onChangeText={setPassword}
        password
        textContentType="newPassword"
        value={password}
      />
      <PasswordChecklist password={password} />

      <Button label="Create account" loading={working} onPress={() => void register()} variant="dark" />
      <Button label="I already have an account" onPress={() => router.back()} style={styles.secondary} variant="ghost" />
      <Text style={styles.terms}>By creating an account you agree to GigGuru&apos;s Terms of Service.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { marginTop: Spacing.lg, marginBottom: Spacing.xl, lineHeight: 19 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  secondary: { marginTop: Spacing.sm },
  terms: { fontSize: 12, textAlign: 'center', color: Colors.textFaint, marginTop: Spacing.md, lineHeight: 17 },
});
