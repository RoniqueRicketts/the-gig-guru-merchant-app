import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, FormField, InlineNotice, PageHeader, Surface } from '@/components/ui';
import { Brand, MaxContentWidth } from '@/constants/theme';
import { request, unwrapData } from '@/lib/api';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type ScheduleEntry = { index: string; title: string; start: string; end: string };
type DayEntry = { enabled: boolean; start: string; end: string };

const emptyWeek = (): DayEntry[] => days.map(() => ({ enabled: false, start: '09:00', end: '17:00' }));

export default function ScheduleScreen() {
  const [week, setWeek] = useState<DayEntry[]>(emptyWeek);
  const [duration, setDuration] = useState('');
  const [breaks, setBreaks] = useState('');
  const [limit, setLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = unwrapData<Record<string, unknown>>(await request('/schedules'));
      setDuration(data?.schedule_duration == null ? '' : String(data.schedule_duration));
      setBreaks(data?.breaks == null ? '' : String(data.breaks));
      setLimit(data?.booking_limit == null ? '' : String(data.booking_limit));
      const entries = Array.isArray(data?.schedule) ? (data.schedule as ScheduleEntry[]) : [];
      const next = emptyWeek();
      entries.forEach((entry) => {
        const index = Number(entry.index);
        if (Number.isInteger(index) && index >= 0 && index < 7) {
          next[index] = { enabled: true, start: entry.start, end: entry.end };
        }
      });
      setWeek(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setError(null);
    setSaved(false);
    const digitValues = [duration, breaks, limit];
    if (digitValues.some((value) => !/^\d+$/.test(value.trim()))) {
      setError('Duration, breaks and booking limit must be entered as whole numbers.');
      return;
    }
    const schedule = week.flatMap((day, index) => {
      if (!day.enabled) return [];
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(day.start) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(day.end)) {
        return [{ index: String(index), title: days[index], start: '', end: '' }];
      }
      return [{ index: String(index), title: days[index], start: day.start, end: day.end }];
    });
    if (schedule.length === 0) {
      setError('Choose at least one open day.');
      return;
    }
    if (schedule.some((entry) => !entry.start || !entry.end || entry.end <= entry.start)) {
      setError('Every open day needs valid 24-hour times, with closing later than opening.');
      return;
    }
    setWorking(true);
    try {
      await request('/schedules', {
        method: 'PUT',
        body: {
          schedule_duration: duration.trim(),
          breaks: breaks.trim(),
          booking_limit: limit.trim(),
          schedule,
        },
      });
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your schedule.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <PageHeader eyebrow="BUSINESS MANAGEMENT" title="Schedule" subtitle="Set your weekly hours and booking preferences." />
          {error ? <InlineNotice message={error} /> : null}
          {saved ? <InlineNotice message="Your schedule has been saved." tone="info" /> : null}
          <Surface style={styles.preferences}>
            <Text style={styles.sectionTitle}>Booking preferences</Text>
            <Text style={styles.helper}>Enter whole numbers as required by your business API.</Text>
            <View style={styles.row}>
              <FormField keyboardType="number-pad" label="Appointment duration" onChangeText={setDuration} value={duration} />
              <FormField keyboardType="number-pad" label="Breaks" onChangeText={setBreaks} value={breaks} />
            </View>
            <FormField keyboardType="number-pad" label="Booking limit" onChangeText={setLimit} value={limit} />
          </Surface>
          <Text style={styles.weekHeading}>WEEKLY HOURS</Text>
          {week.map((day, index) => (
            <Surface key={days[index]} style={styles.dayCard}>
              <View style={styles.dayTop}>
                <View style={[styles.dot, day.enabled && styles.dotActive]} />
                <Text style={styles.dayName}>{days[index]}</Text>
                <AppButton
                  label={day.enabled ? 'Open' : 'Closed'}
                  onPress={() =>
                    setWeek((current) =>
                      current.map((entry, itemIndex) => itemIndex === index ? { ...entry, enabled: !entry.enabled } : entry)
                    )
                  }
                  variant={day.enabled ? 'secondary' : 'quiet'}
                />
              </View>
              {day.enabled ? (
                <View style={styles.timeRow}>
                  <FormField
                    autoCapitalize="none"
                    label="Opens"
                    onChangeText={(start) => setWeek((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, start } : entry))}
                    placeholder="09:00"
                    value={day.start}
                  />
                  <FormField
                    autoCapitalize="none"
                    label="Closes"
                    onChangeText={(end) => setWeek((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, end } : entry))}
                    placeholder="17:00"
                    value={day.end}
                  />
                </View>
              ) : null}
            </Surface>
          ))}
          <AppButton label="Save schedule" loading={working || loading} onPress={() => void save()} style={styles.saveButton} />
          <Text style={styles.helper}>The API supports viewing and updating a schedule. It does not expose per-customer availability or open-slot lookup.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  flex: { flex: 1 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 19, paddingBottom: 40 },
  preferences: { marginBottom: 17 },
  sectionTitle: { color: Brand.deep, fontSize: 16, fontWeight: '800' },
  helper: { color: Brand.muted, fontSize: 11, lineHeight: 17, marginTop: 6, marginBottom: 11 },
  row: { flexDirection: 'row', gap: 10 },
  weekHeading: { color: Brand.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 9, marginTop: 2 },
  dayCard: { padding: 13, marginBottom: 8 },
  dayTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#C4D0C2' },
  dotActive: { backgroundColor: Brand.green },
  dayName: { color: Brand.deep, fontSize: 13, fontWeight: '800', flex: 1 },
  timeRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  saveButton: { marginTop: 9 },
});
