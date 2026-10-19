import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { passwordChecks } from '@/lib/security';

export function PasswordChecklist({ password }: { password: string }) {
  return (
    <View accessibilityLabel="Password requirements" style={styles.wrap}>
      {passwordChecks(password).map((check) => (
        <View key={check.label} style={styles.item}>
          <Icon color={check.met ? Colors.primary : Colors.textFaint} name={check.met ? 'check.circle' : 'cancel'} size={14} />
          <Text style={[styles.text, check.met && styles.met]}>{check.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginTop: -Spacing.sm, marginBottom: Spacing.lg },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  text: { fontSize: 12, color: Colors.textMuted },
  met: { color: Colors.primary, fontWeight: '600' },
});
