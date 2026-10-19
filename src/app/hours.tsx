import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ChoiceChips, ListGroup, Select, Stepper, useToast } from '@/components/ui';
import { DurationPresets } from '@/constants/enums';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request } from '@/lib/api';
import { haptic } from '@/lib/haptics';
import { rows, str, type Row } from '@/lib/format';
import { safeMessage } from '@/lib/security';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
type Day = { open: boolean; start: string; end: string };

const timeOptions = Array.from({ length: 48 }, (_, index) => {
  const value = `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`;
  const label = new Date(2000, 0, 1, Math.floor(index / 2), index % 2 ? 30 : 0).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return { value, label };
});

const breakOptions = ['0', '5', '10', '15', '30'].map((value) => ({ value, label: value === '0' ? 'None' : `${value} min` }));

export default function HoursScreen() {
  const query = useQuery<Row | null>('/schedules');
  if (query.loading) return <FormScreen loading onSave={() => {}} saveLabel="" saving={false} title="Business hours">{null}</FormScreen>;
  if (query.error && !query.data) {
    return (
      <FormScreen loadError={query.error} onRetry={() => void query.refresh()} onSave={() => {}} saveLabel="" saving={false} title="Business hours">
        {null}
      </FormScreen>
    );
  }
  return <HoursForm initial={query.data} />;
}

function HoursForm({ initial }: { initial: Row | null }) {
  const toast = useToast();
  const [week, setWeek] = useState<Day[]>(() => {
    const configured = rows(initial?.schedule);
    return days.map((_, index) => {
      const entry = configured.find((item) => str(item.index) === String(index));
      if (entry && TIME.test(str(entry.start)) && TIME.test(str(entry.end))) return { open: true, start: str(entry.start), end: str(entry.end) };
      // Sensible default for a fresh account: open weekdays 9–5.
      return { open: !configured.length && index >= 1 && index <= 5, start: '09:00', end: '17:00' };
    });
  });
  const [duration, setDuration] = useState(/^\d+$/.test(str(initial?.schedule_duration)) ? str(initial?.schedule_duration) : '60');
  const [breaks, setBreaks] = useState(/^\d+$/.test(str(initial?.breaks)) ? str(initial?.breaks) : '0');
  const [limit, setLimit] = useState(Number(str(initial?.booking_limit)) || 1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (index: number, patch: Partial<Day>) => setWeek((current) => current.map((day, i) => (i === index ? { ...day, ...patch } : day)));

  const save = async () => {
    const schedule = week.flatMap((day, index) => (day.open ? [{ index: String(index), title: days[index], start: day.start, end: day.end }] : []));
    if (!schedule.length) return setError('Open at least one day.');
    const bad = schedule.find((entry) => entry.end <= entry.start);
    if (bad) return setError(`${bad.title}: closing time must be after opening time.`);
    setError(null);
    setSaving(true);
    try {
      await request('/schedules', {
        method: 'PUT',
        body: { schedule_duration: duration, breaks, booking_limit: String(limit), schedule },
      });
      toast.success('Hours saved');
    } catch (cause) {
      setError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen error={error} onSave={() => void save()} saveLabel="Save hours" saving={saving} title="Business hours">
      <ListGroup title="Weekly hours">
        {week.map((day, index) => (
          <View key={days[index]} style={styles.day}>
            <View style={styles.dayTop}>
              <Text style={styles.dayName}>{days[index]}</Text>
              <Text style={[Type.caption, styles.dayState]}>{day.open ? 'Open' : 'Closed'}</Text>
              <Switch
                accessibilityLabel={`${days[index]} open`}
                onValueChange={(open) => {
                  haptic.select();
                  update(index, { open });
                }}
                thumbColor={Colors.white}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                value={day.open}
              />
            </View>
            {day.open ? (
              <View style={styles.times}>
                <View style={styles.flex}>
                  <Select label="Opens" onChange={(start) => update(index, { start })} options={timeOptions} value={day.start} />
                </View>
                <View style={styles.flex}>
                  <Select label="Closes" onChange={(end) => update(index, { end })} options={timeOptions} value={day.end} />
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </ListGroup>

      <Text style={styles.section}>Booking rules</Text>
      <ChoiceChips label="Default booking length" onChange={setDuration} options={DurationPresets} value={duration} />
      <ChoiceChips label="Break between bookings" onChange={setBreaks} options={breakOptions} value={breaks} />
      <View style={styles.limit}>
        <View style={styles.flex}>
          <Text style={styles.limitLabel}>Bookings at the same time</Text>
          <Text style={Type.caption}>How many customers you can serve at once</Text>
        </View>
        <Stepper label="Booking limit" max={50} min={1} onChange={setLimit} value={limit} />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  day: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  dayTop: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  dayName: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.text },
  dayState: { marginRight: Spacing.sm },
  times: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
  section: { fontSize: 18, fontWeight: '700', color: Colors.text, marginTop: Spacing.xxl, marginBottom: Spacing.md },
  limit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  limitLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
});
