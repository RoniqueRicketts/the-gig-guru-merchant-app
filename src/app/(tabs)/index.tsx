import { router } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { AppIcon, Surface, type AppIconName } from '@/components/ui';
import { Brand, MaxContentWidth } from '@/constants/theme';
import { request, unwrapData } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Appointment = Record<string, unknown>;
type DashboardData = {
  businessName: string | null;
  appointments: Appointment[];
  today: number;
  orders: number | null;
  products: number | null;
  services: number | null;
  errors: string[];
};

function rowsFrom(response: unknown): Appointment[] {
  const data = unwrapData<unknown>(response);
  return Array.isArray(data) ? data.filter((item): item is Appointment => !!item && typeof item === 'object') : [];
}

function dateFrom(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function countFrom(response: unknown): number {
  if (response && typeof response === 'object') {
    const root = response as Record<string, unknown>;
    const pagination = root.pagination && typeof root.pagination === 'object'
      ? root.pagination as Record<string, unknown>
      : null;
    const total = pagination?.total ?? root.total;
    if (typeof total === 'number' && Number.isFinite(total)) return total;
  }
  return rowsFrom(response).length;
}

async function loadDashboardData(): Promise<DashboardData> {
  const results = await Promise.allSettled([
    request<unknown>('/companies'),
    request<unknown>('/appointments?timeframe=upcoming&skip=0'),
    request<unknown>('/orders?skip=0'),
    request<unknown>('/products?limit=50&skip=0'),
    request<unknown>('/services?limit=50&skip=0'),
  ]);
  const errors: string[] = [];
  const value = (index: number, label: string): unknown => {
    const result = results[index];
    if (result.status === 'fulfilled') return result.value;
    errors.push(`${label}: ${result.reason instanceof Error ? result.reason.message : 'Unable to load.'}`);
    return null;
  };

  const companyData = value(0, 'Business profile');
  const company = unwrapData<unknown>(companyData);
  const companyRecord = Array.isArray(company) ? company[0] : company;
  const businessName = companyRecord && typeof companyRecord === 'object' && 'name' in companyRecord &&
    typeof companyRecord.name === 'string' ? companyRecord.name : null;
  const appointmentsData = value(1, 'Appointments');
  const appointments = appointmentsData === null ? [] : rowsFrom(appointmentsData);
  const today = appointments.filter((appointment) =>
    dateFrom(appointment.start)?.toDateString() === new Date().toDateString()
  ).length;
  const orders = value(2, 'Orders');
  const products = value(3, 'Products');
  const services = value(4, 'Services');

  return {
    businessName,
    appointments,
    today,
    orders: orders === null ? null : countFrom(orders),
    products: products === null ? null : countFrom(products),
    services: services === null ? null : countFrom(services),
    errors,
  };
}

export default function HomeScreen() {
  const { session } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    loadDashboardData()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      setDashboard(await loadDashboardData());
    } finally {
      setRefreshing(false);
    }
  };

  const appointments = dashboard?.appointments ?? [];
  const firstName = dashboard?.businessName || session?.email?.split('@')[0] || 'Merchant';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl onRefresh={() => void refresh()} refreshing={refreshing} tintColor={Brand.green} />}
        showsVerticalScrollIndicator={false}>
        <View style={styles.topline}>
          <View style={styles.greetingCopy}>
            <Text style={styles.greeting}>Hello, <Text style={styles.businessName}>{firstName}</Text></Text>
            <Text style={styles.subtitle}>Here&apos;s how your business is doing.</Text>
          </View>
          <Pressable
            accessibilityLabel="Open account and settings"
            accessibilityRole="button"
            onPress={() => router.navigate('/(tabs)/profile')}
            style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
            <AppIcon name="person.crop.circle" color={Brand.green} size={23} />
          </Pressable>
        </View>

        <View style={styles.overviewRow}>
          <Text style={styles.sectionTitle}>Business overview</Text>
          <Text style={styles.todayLabel}>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
        </View>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={Brand.green} /></View>
        ) : (
          <View style={styles.metrics}>
            <MetricCard icon="calendar" label="Today’s visits" value={dashboard ? String(dashboard.today) : '—'} onPress={() => router.navigate('/(tabs)/manage')} />
            <MetricCard icon="bag.fill" label="Orders" value={dashboard?.orders === null || !dashboard ? '—' : String(dashboard.orders)} onPress={() => router.navigate('/orders')} />
            <MetricCard icon="shippingbox.fill" label="Products" value={dashboard?.products === null || !dashboard ? '—' : String(dashboard.products)} onPress={() => router.navigate('/products')} />
            <MetricCard icon="sparkles" label="Services" value={dashboard?.services === null || !dashboard ? '—' : String(dashboard.services)} onPress={() => router.navigate('/services')} />
          </View>
        )}

        {dashboard?.errors.length ? (
          <Surface style={styles.noticeCard}>
            <View style={styles.noticeIcon}><AppIcon name="info.circle" color={Brand.green} size={17} /></View>
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>Some information is unavailable</Text>
              <Text style={styles.noticeText}>{dashboard.errors.join('\n')}</Text>
            </View>
          </Surface>
        ) : null}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Coming up</Text>
            <Text style={styles.sectionSub}>Your next scheduled customer visits.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate('/(tabs)/manage')}
            style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}>
            <Text style={styles.textActionLabel}>Calendar</Text>
            <AppIcon name="chevron.right" color={Brand.green} size={13} />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.listLoading}><ActivityIndicator color={Brand.green} size="small" /></View>
        ) : appointments.length ? (
          appointments.slice(0, 3).map((appointment, index) => {
            const date = dateFrom(appointment.start);
            return (
              <Pressable
                accessibilityRole="button"
                key={String(appointment.id || index)}
                onPress={() => router.navigate('/appointments')}
                style={({ pressed }) => [pressed && styles.pressed]}>
                <Surface style={styles.appointmentCard}>
                  <View style={styles.dateMark}>
                    <Text style={styles.dateMarkText}>{date ? date.getDate() : '—'}</Text>
                    <Text style={styles.dateMarkMonth}>{date?.toLocaleDateString(undefined, { month: 'short' }).toUpperCase() ?? 'DATE'}</Text>
                  </View>
                  <View style={styles.appointmentCopy}>
                    <Text numberOfLines={1} style={styles.appointmentTitle}>{String(appointment.fullname || 'Customer appointment')}</Text>
                    <Text numberOfLines={1} style={styles.appointmentDetail}>
                      {String(appointment.serviceName || 'Appointment')}
                      {date ? `  ·  ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}
                    </Text>
                  </View>
                  <AppIcon name="chevron.right" color={Brand.muted} size={15} />
                </Surface>
              </Pressable>
            );
          })
        ) : (
          <Surface style={styles.emptyCard}>
            <View style={styles.emptyIcon}><AppIcon name="calendar" color={Brand.green} size={21} /></View>
            <Text style={styles.emptyTitle}>Nothing on the calendar yet</Text>
            <Text style={styles.emptyText}>Your upcoming bookings will appear here.</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.navigate('/(tabs)/manage')}
              style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}>
              <Text style={styles.emptyActionText}>Open calendar</Text>
              <AppIcon name="chevron.right" color={Brand.green} size={14} />
            </Pressable>
          </Surface>
        )}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Shortcuts</Text>
            <Text style={styles.sectionSub}>Tap once to get where you need to go.</Text>
          </View>
        </View>
        <View style={styles.shortcuts}>
          <Shortcut icon="plus" title="New appointment" onPress={() => router.push({ pathname: '/appointments', params: { create: 'true' } })} />
          <Shortcut icon="sparkles" title="Manage services" onPress={() => router.navigate('/services')} />
          <Shortcut icon="building.2.fill" title="Business settings" onPress={() => router.navigate('/(tabs)/profile')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricCard({ icon, label, value, onPress }: { icon: AppIconName; label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.metricWrap, pressed && styles.pressed]}>
      <Surface style={styles.metricCard}>
        <View style={styles.metricTop}>
          <AppIcon name={icon} color={Brand.green} size={20} />
          <AppIcon name="arrow.up.right" color={Brand.deep} size={14} />
        </View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{label}</Text>
      </Surface>
    </Pressable>
  );
}

function Shortcut({ icon, title, onPress }: { icon: AppIconName; title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
      <View style={styles.shortcutIcon}><AppIcon name={icon} color={Brand.green} size={17} /></View>
      <Text style={styles.shortcutTitle}>{title}</Text>
      <AppIcon name="chevron.right" color={Brand.muted} size={14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 15, paddingBottom: 24 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  greetingCopy: { flex: 1, paddingRight: 12 },
  greeting: { color: Brand.deep, fontSize: 21, fontWeight: '500', letterSpacing: -0.4 },
  businessName: { fontWeight: '800' },
  subtitle: { color: Brand.deep, fontSize: 13, marginTop: 5 },
  avatar: { width: 43, height: 43, borderRadius: 22, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Brand.border },
  pressed: { opacity: 0.68 },
  overviewRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 },
  sectionTitle: { color: Brand.deep, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  todayLabel: { color: Brand.muted, fontSize: 11 },
  loading: { minHeight: 204, alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  metricWrap: { width: '48%', flexGrow: 1 },
  metricCard: { minHeight: 116, padding: 13, borderRadius: 16 },
  metricTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metricValue: { color: Brand.deep, fontSize: 25, lineHeight: 30, fontWeight: '800', marginTop: 11 },
  metricLabel: { color: Brand.muted, fontSize: 11, marginTop: 2 },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 14, padding: 12, marginBottom: 13, backgroundColor: '#F0F7EE' },
  noticeIcon: { width: 27, height: 27, borderRadius: 9, backgroundColor: Brand.white, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: Brand.deep, fontSize: 12, fontWeight: '700' },
  noticeText: { color: Brand.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 9, marginBottom: 10 },
  sectionSub: { color: Brand.muted, fontSize: 11, marginTop: 3 },
  textAction: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 3, paddingLeft: 8 },
  textActionLabel: { color: Brand.green, fontSize: 12, fontWeight: '700' },
  listLoading: { minHeight: 108, justifyContent: 'center', alignItems: 'center' },
  appointmentCard: { minHeight: 73, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 15, marginBottom: 8 },
  dateMark: { width: 45, height: 47, borderRadius: 13, backgroundColor: Brand.softGreen, justifyContent: 'center', alignItems: 'center' },
  dateMarkText: { color: Brand.deep, fontSize: 17, fontWeight: '800' },
  dateMarkMonth: { color: Brand.green, fontSize: 8, fontWeight: '800' },
  appointmentCopy: { flex: 1 },
  appointmentTitle: { color: Brand.deep, fontSize: 13, fontWeight: '700' },
  appointmentDetail: { color: Brand.muted, fontSize: 11, marginTop: 4 },
  emptyCard: { alignItems: 'center', padding: 17, borderRadius: 17 },
  emptyIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: Brand.softGreen, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { color: Brand.deep, fontSize: 14, fontWeight: '800' },
  emptyText: { color: Brand.muted, fontSize: 11, textAlign: 'center', marginTop: 4 },
  emptyAction: { minHeight: 39, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10 },
  emptyActionText: { color: Brand.green, fontSize: 12, fontWeight: '700' },
  shortcuts: { gap: 8 },
  shortcut: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, backgroundColor: Brand.white, borderWidth: 1, borderColor: Brand.border, borderRadius: 14 },
  shortcutIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: Brand.softGreen, alignItems: 'center', justifyContent: 'center' },
  shortcutTitle: { flex: 1, color: Brand.deep, fontSize: 12, fontWeight: '700' },
});
