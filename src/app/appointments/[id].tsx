import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Modal, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { confirmAction, isOpenStatus, primaryActionFor, updateAppointmentStatus } from '@/components/appointment-card';
import {
  Avatar,
  Banner,
  Button,
  DayPicker,
  ErrorState,
  IconButton,
  ListGroup,
  ListRow,
  Screen,
  SkeletonList,
  StatusBadge,
  TimeSlots,
  buildSlots,
  toOffsetIso,
  useToast,
} from '@/components/ui';
import type { AppointmentNextStatus } from '@/constants/enums';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { appointment, dateLabel, dayKey, money, str, timeLabel, toDate, type Row } from '@/lib/format';
import { isE164, safeMessage } from '@/lib/security';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const query = useQuery<Row>(id ? `/appointments/${seg(id)}` : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  if (query.loading) return <Screen><SkeletonList count={4} /></Screen>;
  if (!query.data) return <ErrorState message={query.error ?? "We couldn't find this booking."} onRetry={() => void query.refresh()} />;

  const row = query.data;
  const status = str(row.status);
  const action = primaryActionFor(status);
  const open = isOpenStatus(status);
  const customer = appointment.customer(row);
  const phone = appointment.phone(row);
  const start = toDate(row.start);
  const end = toDate(row.end);
  const minutes = start && end ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)) : 60;

  const setStatus = async (next: AppointmentNextStatus, done: string) => {
    setBusy(next);
    try {
      await updateAppointmentStatus(id, next);
      toast.success(done);
      await query.refresh();
    } catch (cause) {
      toast.error(safeMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        action ? (
          <Button
            icon={action.status === 'Completed' ? 'check' : 'play'}
            label={action.status === 'Completed' ? 'Mark complete' : 'Start booking'}
            loading={busy === action.status}
            onPress={() => void setStatus(action.status, action.done)}
          />
        ) : undefined
      }
      refreshControl={<RefreshControl onRefresh={() => void query.refresh()} refreshing={query.refreshing} tintColor={Colors.primary} />}>
      <View style={styles.header}>
        <Avatar name={customer} size={72} />
        <Text style={[Type.title, styles.name]}>{customer}</Text>
        <Text style={Type.caption}>{appointment.service(row)}</Text>
        <View style={styles.badge}><StatusBadge status={status} /></View>
        {phone && isE164(phone) ? (
          <View style={styles.contact}>
            <IconButton icon="phone" label={`Call ${customer}`} onPress={() => void Linking.openURL(`tel:${phone}`)} variant="tinted" />
          </View>
        ) : null}
      </View>

      {query.error ? <Banner message={query.error} /> : null}

      <ListGroup>
        <ListRow icon="calendar" title={dateLabel(row.start, { weekday: 'long', month: 'long', day: 'numeric' })} />
        <ListRow icon="clock" title={`${timeLabel(row.start)} – ${timeLabel(row.end)}`} value={`${minutes} min`} />
        {appointment.price(row) !== undefined ? <ListRow icon="payment" title="Price" value={money(appointment.price(row))} /> : null}
        {appointment.staff(row) ? <ListRow icon="person" title="With" value={appointment.staff(row)} /> : null}
        {appointment.branch(row) ? <ListRow icon="location" title="Location" value={appointment.branch(row)} /> : null}
        {phone ? <ListRow icon="phone" title="Phone" value={phone} /> : null}
      </ListGroup>

      {str(row.notes) ? (
        <View style={styles.notes}>
          <Text style={Type.micro}>NOTES</Text>
          <Text style={[Type.body, styles.notesText]}>{str(row.notes)}</Text>
        </View>
      ) : null}

      {open ? (
        <ListGroup style={styles.actions} title="More actions">
          <ListRow icon="reschedule" onPress={() => setRescheduling(true)} title="Reschedule" />
          {status !== 'In_Progress' ? (
            <ListRow
              icon="no.show"
              onPress={() => confirmAction('Mark as no-show?', `${customer} will be marked as a no-show.`, 'Mark no-show', () => void setStatus('No_Show', 'Marked no-show'))}
              title="Mark no-show"
            />
          ) : null}
          <ListRow
            destructive
            icon="cancel"
            onPress={() => confirmAction('Cancel this booking?', `${customer}'s booking will be canceled.`, 'Cancel booking', () => void setStatus('Canceled', 'Booking canceled'))}
            title="Cancel booking"
          />
        </ListGroup>
      ) : null}

      <RescheduleSheet
        currentStart={start}
        minutes={minutes}
        onClose={() => setRescheduling(false)}
        onDone={async () => {
          setRescheduling(false);
          toast.success('Booking rescheduled');
          await query.refresh();
        }}
        id={id}
        visible={rescheduling}
      />
    </Screen>
  );
}

function RescheduleSheet({
  id,
  visible,
  minutes,
  currentStart,
  onClose,
  onDone,
}: {
  id: string;
  visible: boolean;
  minutes: number;
  currentStart: Date | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const today = dayKey(new Date());
  const initial = currentStart && dayKey(currentStart) >= today ? dayKey(currentStart) : today;
  const [day, setDay] = useState(initial);
  const [time, setTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!time) return setError('Pick a new time.');
    setSaving(true);
    setError(null);
    try {
      await request(`/appointments/${seg(id)}/reschedule`, {
        method: 'PATCH',
        body: { start: toOffsetIso(day, time), end: toOffsetIso(day, time, minutes) },
      });
      setTime(null);
      onDone();
    } catch (cause) {
      setError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet" visible={visible}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={Type.title}>Reschedule</Text>
          <IconButton icon="close" label="Close" onPress={onClose} />
        </View>
        <Screen edges={[]} footer={<Button label="Save new time" loading={saving} onPress={() => void save()} />}>
          {error ? <Banner message={error} /> : null}
          <DayPicker
            onChange={(value) => {
              setDay(value);
              setTime(null);
            }}
            value={day}
          />
          <TimeSlots label={`Time · ${minutes} min`} onChange={setTime} slots={buildSlots(day)} value={time} />
        </Screen>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: Spacing.xl },
  name: { marginTop: Spacing.md },
  badge: { marginTop: Spacing.sm },
  contact: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
  notes: { marginTop: Spacing.xl, gap: Spacing.sm },
  notesText: { lineHeight: 22 },
  actions: { marginTop: Spacing.xxl },
  sheet: { flex: 1, backgroundColor: Colors.background },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
});
