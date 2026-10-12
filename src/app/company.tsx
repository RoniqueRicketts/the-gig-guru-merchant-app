import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, FormField, InlineNotice, PageHeader } from '@/components/ui';
import { Brand, MaxContentWidth } from '@/constants/theme';
import { request, unwrapData } from '@/lib/api';

type Company = Record<string, unknown>;
const fields = [
  { key: 'name', label: 'Business name' },
  { key: 'email', label: 'Business email', keyboardType: 'email-address' as const },
  { key: 'telephone', label: 'Telephone' },
  { key: 'avatar', label: 'Logo image URL' },
  { key: 'theme', label: 'Theme color' },
];

export default function CompanyScreen() {
  const [company, setCompany] = useState<Company | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = unwrapData<Company | null>(await request('/companies'));
      setCompany(result);
      setValues(Object.fromEntries(fields.map((field) => [field.key, result?.[field.key] == null ? '' : String(result[field.key])])));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load company profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    const body = Object.fromEntries(
      Object.entries(values)
        .filter(([key, value]) => value.trim() && value.trim() !== String(company?.[key] ?? ''))
        .map(([key, value]) => [key, value.trim()])
    );
    if (Object.keys(body).length === 0) {
      setError('There are no profile changes to save.');
      return;
    }
    setError(null);
    setSaved(false);
    setWorking(true);
    try {
      const result = unwrapData<Company | null>(await request('/companies', { method: 'PATCH', body }));
      setCompany(result);
      setValues(Object.fromEntries(fields.map((field) => [field.key, result?.[field.key] == null ? '' : String(result[field.key])])));
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save company profile.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <PageHeader eyebrow="BUSINESS SETTINGS" title="Company profile" subtitle="Keep your business identity and contact details current." />
          {error ? <InlineNotice message={error} /> : null}
          {saved ? <InlineNotice message="Company profile saved." tone="info" /> : null}
          {!loading && !company ? (
            <InlineNotice message="No company profile was returned for this account. Company creation is not available through the current API." tone="info" />
          ) : null}
          {loading ? <Text style={styles.helper}>Loading company profile…</Text> : null}
          <View style={styles.form}>
            {fields.map((field) => (
              <FormField
                key={field.key}
                autoCapitalize={field.key === 'email' ? 'none' : 'words'}
                keyboardType={field.keyboardType || 'default'}
                label={field.label}
                onChangeText={(text) => setValues((current) => ({ ...current, [field.key]: text }))}
                value={values[field.key] || ''}
              />
            ))}
            <AppButton label="Save profile" loading={working || loading} onPress={() => void save()} />
          </View>
          <Text style={styles.helper}>The API supports editing company details but does not provide company creation or deletion.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 20, paddingBottom: 32 },
  form: { backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.border, borderRadius: 20, padding: 17 },
  helper: { color: Brand.muted, fontSize: 12, lineHeight: 18, marginTop: 13 },
});
