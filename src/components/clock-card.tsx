import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { confirmAction } from '@/components/appointment-card';
import { isGated } from '@/components/gated-state';
import { Button, Icon, useToast } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request } from '@/lib/api';
import { durationLabel, elapsedClock, get, str, timeLabel, type Row } from '@/lib/format';
import { safeMessage } from '@/lib/security';

/**
 * One-tap clock in / out for the signed-in staff member (GET /attendance/me).
 * Hidden entirely when the plan doesn't include attendance or the account can't use it.
 */
export function ClockCard() {
  const toast = useToast();
  const shift = useQuery<Row | null>('/attendance/me');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const onShift = !!shift.data && !!str(shift.data.id);

  useEffect(() => {
    if (!onShift) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [onShift]);

  if (shift.loading || isGated(shift.errorStatus) || (shift.error && !shift.data)) return null;

  const clockIn = async () => {
    setBusy(true);
    try {
      await request('/attendance/clock-in', { method: 'POST', body: {} });
      toast.success("You're clocked in");
      await shift.reload();
    } catch (cause) {
      toast.error(safeMessage(cause));
      void shift.reload();
    } finally {
      setBusy(false);
    }
  };

  const clockOut = async () => {
    setBusy(true);
    try {
      const result = await request<unknown>('/attendance/clock-out', { method: 'POST', body: {} });
      const seconds = Number(get(result, 'data', 'seconds'));
      toast.success(Number.isFinite(seconds) ? `Clocked out · ${durationLabel(seconds)} worked` : 'Clocked out');
      await shift.reload();
    } catch (cause) {
      toast.error(safeMessage(cause));
      void shift.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, onShift && styles.cardOn]}>
      <View style={[styles.icon, onShift && styles.iconOn]}>
        <Icon color={onShift ? Colors.deep : Colors.primary} name="clock" size={20} />
      </View>
      <View style={styles.flex}>
        {onShift ? (
          <>
            <Text style={[styles.clock, styles.onText]}>{elapsedClock(shift.data?.clockInAt, now)}</Text>
            <Text numberOfLines={1} style={styles.subOn}>
              On shift since {timeLabel(shift.data?.clockInAt)}
              {str(shift.data?.branchName) ? ` · ${str(shift.data?.branchName)}` : ''}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.title}>Off the clock</Text>
            <Text style={styles.sub}>Clock in when you start work</Text>
          </>
        )}
      </View>
      <Button
        icon={onShift ? 'clock.out' : 'clock.in'}
        label={onShift ? 'Clock out' : 'Clock in'}
        loading={busy}
        onPress={() => (onShift ? confirmAction('Clock out?', 'This ends your current shift.', 'Clock out', () => void clockOut()) : void clockIn())}
        size="md"
        variant={onShift ? 'secondary' : 'primary'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    padding: Spacing.md,
    paddingLeft: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  cardOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: Colors.accent },
  title: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  clock: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.3 },
  onText: { color: Colors.white },
  subOn: { fontSize: 13, color: '#D6EBD5', marginTop: 2 },
});
