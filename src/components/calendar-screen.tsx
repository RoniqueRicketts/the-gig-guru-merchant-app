import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon, InlineNotice, Surface } from '@/components/ui';
import { Brand, MaxContentWidth } from '@/constants/theme';
import { request, unwrapData } from '@/lib/api';

type Appointment = Record<string, unknown>;
type CalendarCell = { date: Date; key: string; inMonth: boolean };

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function asDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function rowsFrom(response: unknown): Appointment[] {
  const data = unwrapData<unknown>(response);
  return Array.isArray(data) ? data.filter((item): item is Appointment => !!item && typeof item === 'object') : [];
}

function makeMonthCells(month: Date): CalendarCell[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(firstDay.getFullYear(), firstDay.getMonth(), 1 - firstDay.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return { date, key: dateKey(date), inMonth: date.getMonth() === month.getMonth() };
  });
}

export default function CalendarScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (skip = 0, append = false) => {
    if (append) setLoadingMore(true);
    else if (appointments.length) setRefreshing(true);
    try {
      const response = await request<unknown>(`/appointments?timeframe=all&skip=${skip}`);
      const rows = rowsFrom(response);
      const body = response && typeof response === 'object' ? response as Record<string, unknown> : {};
      const pagination = body.pagination && typeof body.pagination === 'object'
        ? body.pagination as Record<string, unknown>
        : null;
      setAppointments((current) => append ? [...current, ...rows] : rows);
      setHasMore(typeof pagination?.hasMore === 'boolean' ? pagination.hasMore : rows.length >= 50);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load appointments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [appointments.length]);

  useEffect(() => {
    let active = true;
    request<unknown>('/appointments?timeframe=all&skip=0')
      .then((response) => {
        if (!active) return;
        const rows = rowsFrom(response);
        const body = response && typeof response === 'object' ? response as Record<string, unknown> : {};
        const pagination = body.pagination && typeof body.pagination === 'object'
          ? body.pagination as Record<string, unknown>
          : null;
        setAppointments(rows);
        setHasMore(typeof pagination?.hasMore === 'boolean' ? pagination.hasMore : rows.length >= 50);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Unable to load appointments.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cells = useMemo(() => makeMonthCells(month), [month]);
  const appointmentDates = useMemo(() => {
    const keys = new Set<string>();
    appointments.forEach((appointment) => {
      const date = asDate(appointment.start);
      if (date) keys.add(dateKey(date));
    });
    return keys;
  }, [appointments]);
  const selectedAppointments = useMemo(() => appointments
    .filter((appointment) => {
      const date = asDate(appointment.start);
      return date !== null && dateKey(date) === selectedDay;
    })
    .sort((a, b) => (asDate(a.start)?.getTime() ?? 0) - (asDate(b.start)?.getTime() ?? 0)),
  [appointments, selectedDay]);
  const selectedDate = useMemo(() => {
    const [year, monthIndex, day] = selectedDay.split('-').map(Number);
    return new Date(year, monthIndex - 1, day);
  }, [selectedDay]);

  const changeMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDay(dateKey(next));
  };

  const openAppointments = () => router.navigate('/appointments');
  const createAppointment = () => router.push({ pathname: '/appointments', params: { create: 'true' } });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void load()} refreshing={refreshing} tintColor={Brand.green} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>YOUR BUSINESS</Text>
            <Text style={styles.title}>Appointments</Text>
          </View>
          <Pressable
            accessibilityLabel="Create an appointment"
            accessibilityRole="button"
            onPress={createAppointment}
            style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <AppIcon name="plus" color={Brand.white} size={19} />
          </Pressable>
        </View>

        {error ? <InlineNotice message={error} /> : null}

        <Surface style={styles.calendar}>
          <View style={styles.calendarTitleRow}>
            <View>
              <Text style={styles.calendarTitle}>Calendar</Text>
              <Text style={styles.monthLabel}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
            </View>
            <View style={styles.monthControls}>
              <MonthButton label="Previous month" icon="chevron.left" onPress={() => changeMonth(-1)} />
              <MonthButton label="Next month" icon="chevron.right" onPress={() => changeMonth(1)} />
            </View>
          </View>
          <View style={styles.weekdays}>
            {weekdays.map((day, index) => (
              <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>
            ))}
          </View>
          <View style={styles.grid}>
            {cells.map((cell) => {
              const selected = cell.key === selectedDay;
              const today = cell.key === dateKey(new Date());
              return (
                <Pressable
                  accessibilityLabel={`${cell.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${appointmentDates.has(cell.key) ? ', has appointments' : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={cell.key}
                  onPress={() => {
                    setSelectedDay(cell.key);
                    if (!cell.inMonth) setMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
                  }}
                  style={({ pressed }) => [
                    styles.dayCell,
                    selected && styles.selectedDayCell,
                    pressed && styles.dayPressed,
                  ]}>
                  <Text style={[
                    styles.dayText,
                    !cell.inMonth && styles.outsideDayText,
                    selected && styles.selectedDayText,
                    today && !selected && styles.todayText,
                  ]}>{cell.date.getDate()}</Text>
                  <View style={[styles.dayDot, appointmentDates.has(cell.key) && styles.appointmentDot, selected && styles.selectedAppointmentDot]} />
                </Pressable>
              );
            })}
          </View>
        </Surface>

        <View style={styles.listHeading}>
          <View style={styles.listHeadingCopy}>
            <Text style={styles.listTitle}>{selectedDate.toLocaleDateString(undefined, { weekday: 'long' })}</Text>
            <Text style={styles.listSubtitle}>{selectedDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</Text>
          </View>
          {!loading ? <Text style={styles.dayCount}>{selectedAppointments.length} {selectedAppointments.length === 1 ? 'visit' : 'visits'}</Text> : null}
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={Brand.green} size="small" /></View>
        ) : selectedAppointments.length ? (
          selectedAppointments.map((appointment, index) => {
            const date = asDate(appointment.start);
            const end = asDate(appointment.end);
            return (
              <Pressable
                accessibilityRole="button"
                key={String(appointment.id || index)}
                onPress={openAppointments}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <Surface style={styles.appointmentCard}>
                  <View style={styles.timeColumn}>
                    <Text style={styles.time}>{date?.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) ?? '—'}</Text>
                    <View style={styles.timeline}>
                      <View style={styles.timelineDot} />
                      <View style={styles.timelineLine} />
                    </View>
                  </View>
                  <View style={styles.appointmentInfo}>
                    <Text numberOfLines={1} style={styles.customer}>{String(appointment.fullname || 'Customer appointment')}</Text>
                    <Text numberOfLines={1} style={styles.service}>{String(appointment.serviceName || (appointment.service && typeof appointment.service === 'object' && 'name' in appointment.service ? appointment.service.name : '') || 'Appointment')}</Text>
                    <View style={styles.appointmentMeta}>
                      {end ? <Text style={styles.duration}>Until {end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text> : null}
                      {appointment.status ? <StatusPill status={String(appointment.status)} /> : null}
                    </View>
                  </View>
                  <AppIcon name="chevron.right" color="#9AA79A" size={15} />
                </Surface>
              </Pressable>
            );
          })
        ) : (
          <Surface style={styles.emptyCard}>
            <View style={styles.emptyIcon}><AppIcon name="calendar" color={Brand.green} size={22} /></View>
            <Text style={styles.emptyTitle}>No appointments this day</Text>
            <Text style={styles.emptyText}>Your bookings for this date will appear here.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={openAppointments}
              style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}>
              <Text style={styles.emptyActionText}>View all appointments</Text>
              <AppIcon name="chevron.right" color={Brand.green} size={14} />
            </Pressable>
          </Surface>
        )}

        {hasMore && !loading ? (
          <Pressable
            accessibilityRole="button"
            disabled={loadingMore}
            onPress={() => void load(appointments.length, true)}
            style={({ pressed }) => [styles.loadMore, pressed && styles.pressed]}>
            {loadingMore ? <ActivityIndicator color={Brand.green} /> : <Text style={styles.loadMoreText}>Load more appointments</Text>}
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function MonthButton({ label, icon, onPress }: { label: string; icon: 'chevron.left' | 'chevron.right'; onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.monthButton, pressed && styles.dayPressed]}>
      <AppIcon name={icon} color={Brand.deep} size={15} />
    </Pressable>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized.includes('cancel') || normalized.includes('no_show')
    ? 'red'
    : normalized.includes('pending') || normalized.includes('reschedul')
      ? 'amber'
      : normalized.includes('confirm') || normalized.includes('complete')
        ? 'green'
        : 'gray';
  return (
    <View style={[styles.statusPill, tone === 'red' ? styles.redPill : tone === 'amber' ? styles.amberPill : tone === 'green' ? styles.greenPill : styles.grayPill]}>
      <Text style={[styles.statusText, tone === 'red' ? styles.redText : tone === 'amber' ? styles.amberText : tone === 'green' ? styles.greenText : styles.grayText]}>
        {status.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 18, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 },
  headerCopy: { flex: 1 },
  eyebrow: { color: Brand.green, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: Brand.deep, fontSize: 27, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  addButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#163F18', shadowOpacity: 0.16, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  pressed: { opacity: 0.67 },
  calendar: { padding: 15, borderRadius: 20, borderColor: '#E6ECE5', marginBottom: 23 },
  calendarTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  calendarTitle: { color: Brand.deep, fontSize: 16, fontWeight: '800' },
  monthLabel: { color: Brand.muted, fontSize: 12, marginTop: 4 },
  monthControls: { flexDirection: 'row', gap: 8 },
  monthButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F5F8F4', borderWidth: 1, borderColor: Brand.border, alignItems: 'center', justifyContent: 'center' },
  weekdays: { flexDirection: 'row', marginBottom: 4 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', color: '#899589', fontSize: 11, fontWeight: '700', paddingVertical: 7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  dayPressed: { backgroundColor: '#EEF5EC' },
  selectedDayCell: { backgroundColor: Brand.green },
  dayText: { color: Brand.deep, fontSize: 13, fontWeight: '600' },
  outsideDayText: { color: '#BAC3B9' },
  selectedDayText: { color: Brand.white, fontWeight: '800' },
  todayText: { color: Brand.green, fontWeight: '800' },
  dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2, backgroundColor: 'transparent' },
  appointmentDot: { backgroundColor: '#82B679' },
  selectedAppointmentDot: { backgroundColor: '#D8F0D4' },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11, paddingHorizontal: 2 },
  listHeadingCopy: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  listTitle: { color: Brand.deep, fontSize: 17, fontWeight: '800' },
  listSubtitle: { color: Brand.muted, fontSize: 12 },
  dayCount: { color: Brand.muted, fontSize: 11, fontWeight: '600' },
  loading: { minHeight: 112, alignItems: 'center', justifyContent: 'center' },
  appointmentCard: { minHeight: 94, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 13, borderRadius: 16, marginBottom: 9 },
  timeColumn: { width: 61, alignSelf: 'stretch', alignItems: 'center' },
  time: { color: Brand.deep, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  timeline: { flex: 1, alignItems: 'center' },
  timelineDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: Brand.green, backgroundColor: Brand.white },
  timelineLine: { width: 1, flex: 1, backgroundColor: Brand.border },
  appointmentInfo: { flex: 1, alignSelf: 'stretch', justifyContent: 'center' },
  customer: { color: Brand.deep, fontSize: 14, fontWeight: '700' },
  service: { color: Brand.muted, fontSize: 12, marginTop: 3 },
  appointmentMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  duration: { color: Brand.muted, fontSize: 10 },
  statusPill: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 3 },
  greenPill: { backgroundColor: '#EAF6E8' },
  amberPill: { backgroundColor: '#FFF4D9' },
  redPill: { backgroundColor: '#FDEDEC' },
  grayPill: { backgroundColor: '#F0F2EF' },
  statusText: { fontSize: 9, fontWeight: '700', textTransform: 'capitalize' },
  greenText: { color: '#347A2B' },
  amberText: { color: '#916300' },
  redText: { color: '#B42318' },
  grayText: { color: Brand.muted },
  emptyCard: { alignItems: 'center', padding: 19, borderRadius: 18 },
  emptyIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: Brand.softGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { color: Brand.deep, fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptyText: { color: Brand.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  emptyAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, marginTop: 4 },
  emptyActionText: { color: Brand.green, fontSize: 13, fontWeight: '700' },
  loadMore: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  loadMoreText: { color: Brand.green, fontSize: 13, fontWeight: '700' },
});
