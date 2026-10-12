import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton, InlineNotice, PageHeader, Surface } from '@/components/ui';
import { Brand, MaxContentWidth } from '@/constants/theme';
import { request, unwrapData } from '@/lib/api';
import { useAuth } from '@/lib/auth';

type Appointment = Record<string, unknown>;

function rowsFrom(response: unknown): Appointment[] {
  const data = unwrapData<unknown>(response);
  return Array.isArray(data) ? data.filter((item): item is Appointment => !!item && typeof item === 'object') : [];
}

export default function HomeScreen() {
  const { session } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAppointments(rowsFrom(await request('/appointments?timeframe=upcoming&skip=0')));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your appointments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topline}>
          <View>
            <Text style={styles.eyebrow}>GIGGURU MERCHANT</Text>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.email}>{session?.email}</Text>
          </View>
          <View style={styles.avatar}><Text style={styles.avatarText}>{session?.email?.slice(0, 1).toUpperCase() || 'G'}</Text></View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>YOUR BUSINESS, IN YOUR POCKET</Text>
          <Text style={styles.heroTitle}>Make today{'\n'}a good one.</Text>
          <Text style={styles.heroCopy}>A simpler way to keep your work moving.</Text>
          <AppButton label="Manage your business" onPress={() => router.navigate('/(tabs)/manage')} style={styles.heroButton} />
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Upcoming appointments</Text>
            <Text style={styles.sectionSub}>Your next scheduled customer visits.</Text>
          </View>
          <AppButton label="See all" onPress={() => router.navigate('/appointments')} variant="quiet" />
        </View>

        {error ? <InlineNotice message={error} /> : null}
        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={Brand.green} /></View>
        ) : appointments.length ? (
          appointments.slice(0, 3).map((appointment, index) => (
            <Surface key={String(appointment.id || index)} style={styles.appointmentCard}>
              <View style={styles.dateMark}>
                <Text style={styles.dateMarkText}>
                  {typeof appointment.start === 'string' ? new Date(appointment.start).toLocaleDateString(undefined, { day: 'numeric' }) : '—'}
                </Text>
                <Text style={styles.dateMarkMonth}>
                  {typeof appointment.start === 'string' ? new Date(appointment.start).toLocaleDateString(undefined, { month: 'short' }).toUpperCase() : 'DATE'}
                </Text>
              </View>
              <View style={styles.appointmentCopy}>
                <Text style={styles.appointmentTitle}>{String(appointment.fullname || 'Appointment')}</Text>
                <Text style={styles.appointmentDetail}>
                  {typeof appointment.start === 'string' ? new Date(appointment.start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Time not set'}
                  {appointment.status ? `  ·  ${String(appointment.status).replace('_', ' ')}` : ''}
                </Text>
              </View>
            </Surface>
          ))
        ) : (
          <Surface style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nothing on the calendar yet</Text>
            <Text style={styles.emptyText}>When appointments are created, your upcoming schedule will show here.</Text>
            <AppButton label="Create an appointment" onPress={() => router.navigate('/appointments')} variant="secondary" />
          </Surface>
        )}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Quick actions</Text>
            <Text style={styles.sectionSub}>Pick up right where you left off.</Text>
          </View>
        </View>
        <View style={styles.quickActions}>
          <QuickAction title="Add a service" detail="Share what you offer" icon="sparkles" onPress={() => router.navigate('/services')} />
          <QuickAction title="Add a product" detail="Keep your catalog current" icon="shippingbox.fill" onPress={() => router.navigate('/products')} />
          <QuickAction title="Edit schedule" detail="Set your business hours" icon="clock.fill" onPress={() => router.navigate('/schedules')} />
          <QuickAction title="Manage locations" detail="Addresses & branches" icon="mappin.and.ellipse" onPress={() => router.navigate('/branches')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ title, detail, icon, onPress }: { title: string; detail: string; icon: string; onPress: () => void }) {
  return (
    <AppButton
      icon={icon}
      label={`${title} · ${detail}`}
      onPress={onPress}
      variant="secondary"
      style={styles.quickAction}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Brand.canvas },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', padding: 19, paddingBottom: 35 },
  topline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  eyebrow: { color: Brand.green, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  greeting: { color: Brand.deep, fontSize: 25, fontWeight: '900', marginTop: 4 },
  email: { color: Brand.muted, fontSize: 13, marginTop: 2 },
  avatar: { width: 47, height: 47, borderRadius: 16, backgroundColor: Brand.deep, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Brand.white, fontWeight: '800', fontSize: 17 },
  hero: { borderRadius: 24, padding: 21, backgroundColor: Brand.deep, marginBottom: 24, overflow: 'hidden' },
  heroEyebrow: { color: '#9AE79A', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: Brand.white, fontSize: 32, lineHeight: 35, fontWeight: '900', marginTop: 8 },
  heroCopy: { color: '#D0E4CD', fontSize: 13, marginTop: 8 },
  heroButton: { alignSelf: 'flex-start', marginTop: 18, backgroundColor: Brand.bright },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11, marginTop: 3 },
  sectionTitle: { color: Brand.deep, fontSize: 17, fontWeight: '800' },
  sectionSub: { color: Brand.muted, fontSize: 12, marginTop: 3 },
  loading: { minHeight: 115, justifyContent: 'center' },
  appointmentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 9, padding: 13 },
  dateMark: { width: 48, height: 50, borderRadius: 13, backgroundColor: Brand.softGreen, justifyContent: 'center', alignItems: 'center' },
  dateMarkText: { color: Brand.deep, fontSize: 18, fontWeight: '900' },
  dateMarkMonth: { color: Brand.green, fontSize: 8, fontWeight: '900' },
  appointmentCopy: { flex: 1 },
  appointmentTitle: { color: Brand.deep, fontWeight: '800', fontSize: 14 },
  appointmentDetail: { color: Brand.muted, fontSize: 12, marginTop: 4 },
  emptyCard: { padding: 16, marginBottom: 19 },
  emptyTitle: { color: Brand.deep, fontSize: 15, fontWeight: '800' },
  emptyText: { color: Brand.muted, fontSize: 12, lineHeight: 18, marginVertical: 7 },
  quickActions: { gap: 8 },
  quickAction: { justifyContent: 'flex-start', minHeight: 54, paddingHorizontal: 14 },
});
