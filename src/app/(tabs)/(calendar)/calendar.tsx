import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppointmentCard } from '@/components/appointment-card';
import { Banner, Button, Card, EmptyState, IconButton, Screen, SkeletonList } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { usePagedList } from '@/hooks/use-api';
import { qs } from '@/lib/api';
import { dayKey, isoWithOffset, toDate, type Row } from '@/lib/format';
import { haptic } from '@/lib/haptics';

const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  const weeks = Math.ceil((first.getDay() + new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()) / 7);
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    return { date, key: dayKey(date), inMonth: date.getMonth() === month.getMonth() };
  });
}

export default function CalendarScreen() {
  const todayKey = dayKey(new Date());
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(todayKey);

  const path = useCallback(
    (offset: number) => {
      const start = new Date(month.getFullYear(), month.getMonth(), 1);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59);
      return `/appointments${qs({ start: isoWithOffset(start), end: isoWithOffset(end), skip: offset })}`;
    },
    [month]
  );
  const list = usePagedList<Row>(path, 50);

  // Busy months can exceed one page; pull a few more so day dots are accurate (bounded for rate limits).
  const { hasMore, loadingMore, loadMore, items } = list;
  useEffect(() => {
    if (hasMore && !loadingMore && items.length < 200) void loadMore();
  }, [hasMore, loadingMore, loadMore, items.length]);

  const byDay = useMemo(() => {
    const map = new Map<string, Row[]>();
    list.items.forEach((row) => {
      const date = toDate(row.start);
      if (!date) return;
      const key = dayKey(date);
      map.set(key, [...(map.get(key) ?? []), row]);
    });
    map.forEach((rows) => rows.sort((a, b) => (toDate(a.start)?.getTime() ?? 0) - (toDate(b.start)?.getTime() ?? 0)));
    return map;
  }, [list.items]);

  const cells = useMemo(() => monthCells(month), [month]);
  const dayRows = byDay.get(selected) ?? [];
  const [y, m, d] = selected.split('-').map(Number);
  const selectedDate = new Date(y, m - 1, d);

  const shiftMonth = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    const isCurrent = next.getMonth() === new Date().getMonth() && next.getFullYear() === new Date().getFullYear();
    setSelected(isCurrent ? todayKey : dayKey(next));
  };

  const goToday = () => {
    setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    setSelected(todayKey);
  };

  return (
    <Screen refreshControl={<RefreshControl onRefresh={() => void list.refresh()} refreshing={list.refreshing} tintColor={Colors.primary} />}>
      <Card style={styles.monthCard}>
      <View style={styles.monthBar}>
        <Text style={styles.monthTitle}>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text>
        <View style={styles.monthControls}>
          {selected !== todayKey ? (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={goToday} style={styles.todayPill}>
              <Text style={styles.todayPillText}>Today</Text>
            </Pressable>
          ) : null}
          <IconButton icon="chevron.left" label="Previous month" onPress={() => shiftMonth(-1)} />
          <IconButton icon="chevron.right" label="Next month" onPress={() => shiftMonth(1)} />
        </View>
      </View>

      <View style={styles.weekdays}>
        {weekdays.map((day, index) => (
          <Text key={index} style={styles.weekday}>{day}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell) => {
          const isSelected = cell.key === selected;
          const isToday = cell.key === todayKey;
          const count = byDay.get(cell.key)?.length ?? 0;
          return (
            <Pressable
              accessibilityLabel={`${cell.date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}${count ? `, ${count} bookings` : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              key={cell.key}
              onPress={() => {
                haptic.select();
                setSelected(cell.key);
                if (!cell.inMonth) setMonth(new Date(cell.date.getFullYear(), cell.date.getMonth(), 1));
              }}
              style={styles.cell}>
              <View style={[styles.cellInner, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}>
                <Text style={[styles.cellText, !cell.inMonth && styles.cellOutside, isSelected && styles.cellTextSelected, isToday && !isSelected && styles.cellTextToday]}>
                  {cell.date.getDate()}
                </Text>
              </View>
              <View style={[styles.dot, count > 0 && styles.dotOn]} />
            </Pressable>
          );
        })}
      </View>
      </Card>

      <View style={styles.dayHeader}>
        <Text style={styles.dayTitle}>
          {selected === todayKey ? 'Today' : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
        <Text style={styles.dayCount}>{dayRows.length ? `${dayRows.length} booking${dayRows.length === 1 ? '' : 's'}` : ''}</Text>
      </View>

      {list.error ? <Banner message={list.error} /> : null}
      {list.loading ? (
        <SkeletonList count={3} />
      ) : dayRows.length ? (
        dayRows.map((row, index) => <AppointmentCard key={String(row.id ?? index)} onChanged={() => void list.refresh()} row={row} />)
      ) : (
        <EmptyState
          icon="calendar"
          message={selected >= todayKey ? 'Nothing booked yet. Add one in a few taps.' : 'No bookings on this day.'}
          title="No bookings"
        />
      )}
      {selected >= todayKey && !list.loading ? (
        <Button icon="plus" label="Book this day" onPress={() => router.push({ pathname: '/appointments/new', params: { day: selected } })} variant="secondary" />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthCard: { paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: 0 },
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xs, paddingLeft: Spacing.sm },
  monthTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  monthControls: { flexDirection: 'row', alignItems: 'center' },
  todayPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, backgroundColor: Colors.tint, marginRight: Spacing.xs },
  todayPillText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  weekdays: { flexDirection: 'row' },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, fontWeight: '600', color: Colors.textFaint, paddingVertical: Spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm },
  cell: { width: `${100 / 7}%`, height: 50, alignItems: 'center', justifyContent: 'center' },
  cellInner: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cellSelected: { backgroundColor: Colors.ink },
  cellToday: { backgroundColor: Colors.tint },
  cellText: { fontSize: 15, fontWeight: '500', color: Colors.text },
  cellOutside: { color: Colors.textFaint },
  cellTextSelected: { color: Colors.white, fontWeight: '700' },
  cellTextToday: { color: Colors.primary, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 1 },
  dotOn: { backgroundColor: Colors.primary },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: Spacing.xl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  dayTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  dayCount: { fontSize: 13, color: Colors.textMuted },
});
