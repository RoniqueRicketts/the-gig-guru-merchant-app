import { useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { confirmAction } from '@/components/appointment-card';
import { GatedOrError } from '@/components/gated-state';
import { Avatar, Banner, EmptyState, Icon, ListGroup, ListRow, Screen, SkeletonList, StatusBadge, useToast } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { qs, request, seg } from '@/lib/api';
import { dayKey, deviceTimeZone, durationLabel, get, rows, str, timeLabel, type Row } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { safeMessage } from '@/lib/security';

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + delta));
}

function dayTitle(key: string): string {
  const today = dayKey(new Date());
  if (key === today) return 'Today';
  if (key === shiftDay(today, -1)) return 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Manager view of who worked when, one local day at a time. */
export default function AttendanceScreen() {
  const toast = useToast();
  const [day, setDay] = useState(() => dayKey(new Date()));
  const query = useQuery<Row>(`/attendance${qs({ date: day, tz: deviceTimeZone() })}`);
  const [busy, setBusy] = useState<string | null>(null);
  const isToday = day === dayKey(new Date());

  const shifts = rows(query.data?.rows);
  const stats = (get(query.data, 'stats') as Row | undefined) ?? {};

  const endShift = (row: Row) =>
    confirmAction(`End ${str(row.name) || 'this'}'s shift?`, 'Use this when someone forgot to clock out. It ends the shift now.', 'End shift', async () => {
      setBusy(str(row.id));
      try {
        await request(`/attendance/${seg(str(row.id))}/end`, { method: 'POST' });
        toast.success('Shift ended');
        await query.reload();
      } catch (cause) {
        toast.error(safeMessage(cause));
      } finally {
        setBusy(null);
      }
    });

  const pick = (delta: number) => {
    haptic.select();
    setDay((current) => shiftDay(current, delta));
  };

  return (
    <Screen
      edges={['left', 'right']}
      refreshControl={<RefreshControl onRefresh={() => void query.refresh()} refreshing={query.refreshing} tintColor={Colors.primary} />}>
      <View style={styles.dayBar}>
        <Pressable accessibilityLabel="Previous day" accessibilityRole="button" hitSlop={8} onPress={() => pick(-1)} style={styles.dayArrow}>
          <Icon color={Colors.text} name="chevron.left" size={18} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.dayTitle}>{dayTitle(day)}</Text>
        <Pressable
          accessibilityLabel="Next day"
          accessibilityRole="button"
          accessibilityState={{ disabled: isToday }}
          disabled={isToday}
          hitSlop={8}
          onPress={() => pick(1)}
          style={[styles.dayArrow, isToday && styles.disabled]}>
          <Icon color={Colors.text} name="chevron.right" size={18} />
        </Pressable>
      </View>

      {query.loading && !query.data ? (
        <SkeletonList count={4} />
      ) : query.error && !query.data ? (
        <GatedOrError feature="Staff attendance" icon="clock" message={query.error} onRetry={() => void query.refresh()} status={query.errorStatus} />
      ) : (
        <>
          {query.error ? <Banner message={query.error} /> : null}
          <View style={styles.stats}>
            <StatTile label="On shift now" value={String(Number(stats.onShift) || 0)} />
            <StatTile label="Staff worked" value={String(Number(stats.staffToday) || 0)} />
            <StatTile label="Total hours" value={durationLabel(stats.totalSeconds ?? 0)} />
          </View>

          {shifts.length ? (
            <ListGroup style={styles.group} title="Shifts">
              {shifts.map((row) => {
                const open = !row.clockOutAt;
                const name = str(row.name) || 'Team member';
                return (
                  <ListRow
                    key={str(row.id)}
                    leading={<Avatar name={name} size={40} />}
                    onPress={open ? () => endShift(row) : undefined}
                    subtitle={[
                      `${timeLabel(row.clockInAt)} – ${open ? 'now' : timeLabel(row.clockOutAt)}`,
                      str(row.branchName),
                      row.edited === true ? 'edited' : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                    title={name}
                    trailing={
                      busy === str(row.id) ? (
                        <Text style={styles.ending}>Ending…</Text>
                      ) : open ? (
                        <StatusBadge label="On shift" status="In_Progress" />
                      ) : (
                        <Text style={styles.hours}>{durationLabel(row.seconds)}</Text>
                      )
                    }
                  />
                );
              })}
            </ListGroup>
          ) : (
            <EmptyState icon="clock" message="Shifts appear here when your team clocks in from the app." title={isToday ? 'No one has clocked in' : 'No shifts this day'} />
          )}
          {shifts.some((row) => !row.clockOutAt) ? <Text style={styles.tip}>Tap an open shift to end it for someone who forgot to clock out.</Text> : null}
        </>
      )}
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dayBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.lg },
  dayArrow: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  dayTitle: { fontSize: 18, fontWeight: '800', color: Colors.text },
  stats: { flexDirection: 'row', gap: Spacing.sm },
  tile: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.md },
  tileValue: { fontSize: 22, fontWeight: '800', color: Colors.text, letterSpacing: -0.3 },
  tileLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  group: { marginTop: Spacing.xxl },
  hours: { fontSize: 15, fontWeight: '700', color: Colors.text },
  ending: { fontSize: 13, color: Colors.textMuted },
  tip: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.md },
});
