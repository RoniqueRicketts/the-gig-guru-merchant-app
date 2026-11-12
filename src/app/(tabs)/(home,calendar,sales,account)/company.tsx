import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { Avatar, Banner, Field, useToast } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request } from '@/lib/api';
import { str, type Row } from '@/lib/format';
import { isE164, isEmail, isHttpsUrl, normalizePhone, safeMessage } from '@/lib/security';

export default function CompanyScreen() {
  const query = useQuery<Row | null>('/companies');
  if (query.loading) return <FormScreen loading onSave={() => {}} saveLabel="" saving={false} title="Business profile">{null}</FormScreen>;
  if (query.error && !query.data) {
    return (
      <FormScreen loadError={query.error} onRetry={() => void query.refresh()} onSave={() => {}} saveLabel="" saving={false} title="Business profile">
        {null}
      </FormScreen>
    );
  }
  return <CompanyForm initial={query.data} />;
}

function CompanyForm({ initial }: { initial: Row | null }) {
  const toast = useToast();
  const [name, setName] = useState(str(initial?.name));
  const [email, setEmail] = useState(str(initial?.email));
  const [phone, setPhone] = useState(str(initial?.telephone));
  const [avatar, setAvatar] = useState(str(initial?.avatar));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cleanPhone = normalizePhone(phone);
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Enter your business name.';
    if (email.trim() && !isEmail(email)) next.email = 'Enter a valid email address.';
    if (cleanPhone && !isE164(cleanPhone)) next.phone = 'Use international format, e.g. +18765550123.';
    if (avatar.trim() && !isHttpsUrl(avatar)) next.avatar = 'Logo link must start with https://';
    setErrors(next);
    if (Object.keys(next).length) return setFormError('Please fix the highlighted fields.');

    // PATCH only what changed; the API rejects an empty body.
    const candidate: Record<string, string> = { name: name.trim(), email: email.trim().toLowerCase(), telephone: cleanPhone, avatar: avatar.trim() };
    const body = Object.fromEntries(Object.entries(candidate).filter(([key, value]) => value && value !== str(initial?.[key])));
    if (!Object.keys(body).length) {
      router.back();
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await request('/companies', { method: 'PATCH', body });
      toast.success('Profile saved');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen error={formError} onSave={() => void save()} saveLabel="Save" saving={saving} title="Business profile">
      {!initial ? <Banner message="No business profile was found for this account." tone="warning" /> : null}
      <View style={styles.logo}>
        {isHttpsUrl(avatar) ? (
          <Image contentFit="cover" source={{ uri: avatar }} style={styles.logoImage} />
        ) : (
          <Avatar dark name={name || 'Business'} size={88} />
        )}
      </View>
      <Field autoCapitalize="words" error={errors.name} label="Business name" onChangeText={setName} value={name} />
      <Field autoCapitalize="none" error={errors.email} keyboardType="email-address" label="Business email" maxLength={254} onChangeText={setEmail} value={email} />
      <Field autoComplete="tel" error={errors.phone} keyboardType="phone-pad" label="Phone" maxLength={20} onChangeText={setPhone} placeholder="+1 876 555 0123" value={phone} />
      <Field autoCapitalize="none" autoCorrect={false} error={errors.avatar} hint="Optional · https:// link to your logo" keyboardType="url" label="Logo link" maxLength={2048} onChangeText={setAvatar} value={avatar} />
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', marginBottom: Spacing.xl },
  logoImage: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.surface },
});
