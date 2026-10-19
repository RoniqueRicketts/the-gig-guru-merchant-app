import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Card, StatusBadge, useToast } from '@/components/ui';
import type { AppointmentNextStatus } from '@/constants/enums';
import { Colors, Spacing } from '@/constants/theme';
import { request, seg } from '@/lib/api';
import { appointment, relativeDay, str, timeLabel, type Row } from '@/lib/format';
import { safeMessage } from '@/lib/security';

type NextAction = { status: AppointmentNextStatus; label: string; done: string; confirm?: string };

/** The single most likely next step for a booking — this is what the big button does. */
export function primaryActionFor(status: string): NextAction | null {
  if (status === 'Scheduled' || status === 'Rescheduled') return { status: 'In_Progress', label: 'Start', done: 'Booking started' };
  if (status === 'In_Progress') return { status: 'Completed', label: 'Complete', done: 'Marked complete' };
  return null;
}

export function isOpenStatus(status: string): boolean {
  return status === 'Scheduled' || status === 'Rescheduled' || status === 'In_Progress';
}

export async function updateAppointmentStatus(id: string, nextStatus: AppointmentNextStatus) {
  await request(`/appointments/${seg(id)}/status`, { method: 'PATCH', body: { nextStatus } });
}

export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  Alert.alert(title, message, [
    { text: 'Not now', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export function AppointmentCard({ row, onChanged, showDay = false }: { row: Row; onChanged: () => void; showDay?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const id = str(row.id);
  const status = str(row.status);
  const action = primaryActionFor(status);
  const customer = appointment.customer(row);

  const run = async (next: AppointmentNextStatus, done: string) => {
    setBusy(next);
    try {
      await updateAppointmentStatus(id, next);
      toast.success(`${done} · ${customer}`);
      onChanged();
    } catch (cause) {
      toast.error(safeMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      accessibilityLabel={`${customer}, ${appointment.service(row)} at ${timeLabel(row.start)}`}
      onPress={id ? () => router.push({ pathname: '/appointments/[id]', params: { id } }) : undefined}
      style={styles.card}>
      <View style={styles.top}>
        <View style={styles.time}>
          <Text style={styles.timeText}>{timeLabel(row.start)}</Text>
          {showDay ? <Text style={styles.dayText}>{relativeDay(row.start)}</Text> : null}
        </View>
        <Avatar name={customer} size={40} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={styles.name}>{customer}</Text>
          <Text numberOfLines={1} style={styles.detail}>{appointment.service(row)}</Text>
        </View>
        <StatusBadge status={status} />
      </View>
      {action && id ? (
        <View style={styles.actions}>
          <Button
            icon={action.status === 'Completed' ? 'check' : 'play'}
            label={action.label}
            loading={busy === action.status}
            disabled={!!busy}
            onPress={() => void run(action.status, action.done)}
            size="md"
            style={styles.primary}
          />
          {action.status === 'In_Progress' ? (
            <Button
              disabled={!!busy}
              label="No-show"
              loading={busy === 'No_Show'}
              onPress={() =>
                confirmAction('Mark as no-show?', `${customer} will be marked as a no-show.`, 'Mark no-show', () => void run('No_Show', 'Marked no-show'))
              }
              size="md"
              style={styles.secondary}
              variant="secondary"
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.md, marginBottom: Spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  time: { width: 64 },
  timeText: { fontSize: 14, fontWeight: '700', color: Colors.text },
  dayText: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  copy: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  detail: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  primary: { flex: 1 },
  secondary: { flex: 1 },
});
