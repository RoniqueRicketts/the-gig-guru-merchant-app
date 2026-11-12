import { useState } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';

import { PasswordChecklist } from '@/components/password-checklist';
import { Banner, Button, Field, ListGroup, ListRow, Screen, SwitchRow, useToast } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useAppLock } from '@/lib/app-lock';
import { useAuth } from '@/lib/auth';
import { isStrongPassword, safeMessage } from '@/lib/security';

export default function SecurityScreen() {
  const { changePassword, session } = useAuth();
  const lock = useAppLock();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = async () => {
    setError(null);
    if (!current) return setError('Enter your current password.');
    if (!isStrongPassword(next)) return setError('Choose a new password that meets every requirement.');
    if (next === current) return setError('Your new password must be different.');
    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      toast.success('Password changed');
    } catch (cause) {
      setError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['left', 'right']}>
      <ListGroup style={styles.group} title="App lock">
        <SwitchRow
          detail={
            lock.supported
              ? 'Require Face ID, Touch ID or fingerprint to open the app'
              : Platform.OS === 'web'
                ? 'Available in the mobile app'
                : 'Set up biometrics in your device settings to use this'
          }
          disabled={!lock.supported && !lock.enabled}
          label="Unlock with biometrics"
          onChange={async (enabled) => {
            try {
              await lock.setEnabled(enabled);
              toast.success(enabled ? 'App lock on' : 'App lock off');
            } catch (cause) {
              toast.error(safeMessage(cause));
            }
          }}
          value={lock.enabled}
        />
      </ListGroup>

      <Text style={styles.section}>Change password</Text>
      {error ? <Banner message={error} /> : null}
      <Field autoCapitalize="none" autoComplete="current-password" label="Current password" maxLength={256} onChangeText={setCurrent} password textContentType="password" value={current} />
      <Field autoCapitalize="none" autoComplete="new-password" label="New password" maxLength={256} onChangeText={setNext} password textContentType="newPassword" value={next} />
      <PasswordChecklist password={next} />
      <Button label="Update password" loading={saving} onPress={() => void update()} />

      <ListGroup style={styles.group} title="Your session">
        <ListRow icon="mail" subtitle="Signed in as" title={session?.email ?? ''} />
        <ListRow
          icon="shield"
          subtitle="Tokens are kept in the device's secure keychain, never in plain storage, and are revoked when you sign out."
          title="Encrypted on this device"
        />
      </ListGroup>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: Spacing.xl },
  section: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: Spacing.xxl, marginBottom: Spacing.md },
});
