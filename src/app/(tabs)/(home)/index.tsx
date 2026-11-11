import { router } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppointmentCard, isOpenStatus, primaryActionFor } from '@/components/appointment-card';
import { ClockCard } from '@/components/clock-card';
import {
  Banner,
  EmptyState,
  Icon,
  ListGroup,
  ListRow,
  QuickAction,
  Screen,
  SectionTitle,
  SkeletonList,
} from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { usePagedList, useQuery } from '@/hooks/use-api';
import { qs } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { appointment, endOfDay, isoWithOffset, startOfDay, str, timeLabel, toDate, type Row } from '@/lib/format';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const byStart = (a: Row, b: Row) => (toDate(a.start)?.getTime() ?? 0) - (toDate(b.start)?.getTime() ?? 0);

export default function HomeScreen() {
  const { session } = useAuth();
  const company = useQuery<Row | null>('/companies');

  const todayPath = useCallback(() => {
    const now = new Date();
    return `/appointments${qs({ start: isoWithOffset(startOfDay(now)), end: isoWithOffset(endOfDay(now)) })}`;
  }, []);
  const today = usePagedList<Row>(todayPath, 50);

  const upcomingPath = useCallback(() => `/appointments${qs({ timeframe: 'upcoming' })}`, []);
  const upcoming = usePagedList<Row>(upcomingPath, 50);

  const pendingOrdersPath = useCallback(() => `/orders${qs({ status: 'Pending' })}`, []);
  const pendingOrders = usePagedList<Row>(pendingOrdersPath, 20);

  const invoicesPath = useCallback(() => '/invoices', []);
  const invoices = usePagedList<Row>(invoicesPath, 50);

  const todays = useMemo(() => [...today.items].sort(byStart), [today.items]);
  const openToday = todays.filter((row) => isOpenStatus(str(row.status)));
  const next = openToday.find((row) => str(row.status) === 'In_Progress') ?? openToday[0];
  const doneToday = todays.filter((row) => str(row.status) === 'Completed').length;

  const later = useMemo(() => {
    const tomorrow = endOfDay(new Date()).getTime();
    return upcoming.items
      .filter((row) => (toDate(row.start)?.getTime() ?? 0) > tomorrow && isOpenStatus(str(row.status)))
      .sort(byStart)
      .slice(0, 3);
  }, [upcoming.items]);

  const overdue = invoices.items.filter((row) => str(row.status) === 'Overdue');
  const businessName = str(company.data?.name) || session?.email.split('@')[0] || 'there';

  const refreshing = today.refreshing || company.refreshing;
  const refreshAll = () => {
    void company.refresh();
    void today.refresh();
    void upcoming.refresh();
    void pendingOrders.refresh();
    void invoices.refresh();
  };

  const attention = [
    pendingOrders.items.length > 0 && {
      key: 'orders',
      icon: 'order' as const,
      title: `${pendingOrders.items.length}${pendingOrders.hasMore ? '+' : ''} order${pendingOrders.items.length === 1 ? '' : 's'} to process`,
      subtitle: 'Tap to review and update status',
      onPress: () => router.navigate({ pathname: '/sales', params: { tab: 'orders', filter: 'Pending' } }),
    },
    overdue.length > 0 && {
      key: 'invoices',
      icon: 'invoice' as const,
      title: `${overdue.length} overdue invoice${overdue.length === 1 ? '' : 's'}`,
      subtitle: 'Tap to resend a reminder',
      onPress: () => router.navigate({ pathname: '/sales', params: { tab: 'invoices', filter: 'Overdue' } }),
    },
  ].filter(Boolean) as { key: string; icon: 'order' | 'invoice'; title: string; subtitle: string; onPress: () => void }[];

  return (
    <Screen refreshControl={<RefreshControl onRefresh={refreshAll} refreshing={refreshing} tintColor={Colors.primary} />}>
      <Text numberOfLines={1} style={styles.hello}>
        {greeting()}, <Text style={styles.name}>{businessName}</Text>
      </Text>

      {/* Today hero: the single most important thing right now, actionable in one tap. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => (next ? router.push({ pathname: '/appointments/[id]', params: { id: str(next.id) } }) : router.navigate('/calendar'))}
        style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>TODAY</Text>
          <Text style={styles.heroDate}>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
        </View>
        <View style={styles.heroStats}>
          <HeroStat label="Bookings" value={today.loading ? '–' : String(todays.length)} />
          <HeroStat label="Remaining" value={today.loading ? '–' : String(openToday.length)} />
          <HeroStat label="Done" value={today.loading ? '–' : String(doneToday)} />
        </View>
        <View style={styles.heroNext}>
          <Icon color={Colors.accent} name="clock" size={16} />
          <Text numberOfLines={1} style={styles.heroNextText}>
            {today.loading
              ? 'Loading your day…'
              : next
                ? `${primaryActionFor(str(next.status))?.status === 'Completed' ? 'In progress' : 'Next'}: ${appointment.customer(next)} · ${timeLabel(next.start)}`
                : todays.length
                  ? "You're all done for today"
                  : 'No bookings today'}
          </Text>
          <Icon color={Colors.white} name="chevron.right" size={14} />
        </View>
      </Pressable>

      <ScrollView contentContainerStyle={styles.quickRow} horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroller}>
        <QuickAction icon="plus" label="New booking" onPress={() => router.push('/appointments/new')} tone="primary" />
        <QuickAction icon="invoice" label="Send invoice" onPress={() => router.push('/invoices/new')} />
        <QuickAction icon="order" label="Orders" onPress={() => router.navigate({ pathname: '/sales', params: { tab: 'orders' } })} />
        <QuickAction icon="queue" label="Queue" onPress={() => router.push('/queues')} />
        <QuickAction icon="catalog" label="Catalog" onPress={() => router.push('/catalog')} />
        <QuickAction icon="team" label="Team" onPress={() => router.push('/team')} />
        <QuickAction icon="truck" label="Deliveries" onPress={() => router.push('/deliveries')} />
        <QuickAction icon="hours" label="Hours" onPress={() => router.push('/hours')} />
      </ScrollView>

      <ClockCard />

      {today.error ? <Banner message={today.error} /> : null}

      {attention.length ? (
        <>
          <SectionTitle title="Needs attention" />
          <ListGroup>
            {attention.map((item) => (
              <ListRow icon={item.icon} iconColor={Colors.warning} key={item.key} onPress={item.onPress} subtitle={item.subtitle} title={item.title} />
            ))}
          </ListGroup>
        </>
      ) : null}

      <SectionTitle action="Calendar" onAction={() => router.navigate('/calendar')} title="Today's schedule" />
      {today.loading ? (
        <SkeletonList count={3} />
      ) : todays.length ? (
        todays.map((row, index) => <AppointmentCard key={str(row.id) || index} onChanged={() => void today.refresh()} row={row} />)
      ) : (
        <EmptyState
          action="Add a booking"
          icon="calendar"
          message="Bookings for today will show up here with one-tap Start and Complete."
          onAction={() => router.push('/appointments/new')}
          title="A clear day"
        />
      )}

      {later.length ? (
        <>
          <SectionTitle title="Coming up" />
          {later.map((row, index) => (
            <AppointmentCard key={str(row.id) || index} onChanged={() => void upcoming.refresh()} row={row} showDay />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  hello: { fontSize: 15, color: Colors.textMuted, marginBottom: Spacing.md, marginLeft: Spacing.xs },
  name: { color: Colors.text, fontWeight: '600' },
  hero: { backgroundColor: Colors.deep, borderRadius: Radius.xl, padding: Spacing.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: Colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  heroDate: { color: '#B8CCB7', fontSize: 13 },
  heroStats: { flexDirection: 'row', marginTop: Spacing.lg },
  heroStat: { flex: 1 },
  heroValue: { color: Colors.white, fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  heroStatLabel: { color: '#B8CCB7', fontSize: 13, marginTop: 2 },
  heroNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  heroNextText: { flex: 1, color: Colors.white, fontSize: 14, fontWeight: '600' },
  quickScroller: { marginHorizontal: -Spacing.lg, marginTop: Spacing.xl },
  quickRow: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
});
