import { router, Stack } from 'expo-router';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { GatedOrError } from '@/components/gated-state';
import { HeaderButton } from '@/components/navigation';
import { EmptyState, ListGroup, ListRow, Screen, SkeletonList, StatusBadge } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { get, rows, str, type Row } from '@/lib/format';

/** Smart queues (walk-in lines): one row per queue with its live waiting count. */
export default function QueuesScreen() {
  const query = useQuery<Row[]>('/queues');
  const items = rows(query.data);

  return (
    <Screen
      edges={['left', 'right']}
      refreshControl={<RefreshControl onRefresh={() => void query.refresh()} refreshing={query.refreshing} tintColor={Colors.primary} />}>
      <Stack.Screen
        options={{
          headerRight: () => (query.errorStatus === 402 ? null : <HeaderButton icon="plus" label="New queue" onPress={() => router.push('/queues/edit')} />),
        }}
      />
      {query.loading ? (
        <SkeletonList count={3} />
      ) : query.error && !items.length ? (
        <GatedOrError feature="Queue management" icon="queue" message={query.error} onRetry={() => void query.refresh()} status={query.errorStatus} />
      ) : items.length ? (
        <>
          <Text style={styles.lead}>Tap a queue to call customers, add walk-ins and see wait times.</Text>
          <ListGroup>
            {items.map((row) => {
              const waiting = Number(row.waiting) || 0;
              const open = row.isOpen !== false;
              return (
                <ListRow
                  icon="queue"
                  key={str(row.id)}
                  onPress={() => router.push({ pathname: '/queues/[id]', params: { id: str(row.id) } })}
                  subtitle={[str(get(row, 'branch', 'name')), `${waiting} waiting`].filter(Boolean).join(' · ')}
                  title={str(row.name) || 'Queue'}
                  trailing={<StatusBadge label={open ? 'Open' : 'Closed'} status={open ? 'Completed' : 'neutral'} />}
                />
              );
            })}
          </ListGroup>
        </>
      ) : (
        <View style={styles.empty}>
          <EmptyState
            action="Create a queue"
            icon="queue"
            message="Let walk-in customers take a ticket and wait from their phone. You call them up with one tap."
            onAction={() => router.push('/queues/edit')}
            title="No queues yet"
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { color: Colors.textMuted, fontSize: 14, marginTop: Spacing.lg, marginBottom: Spacing.md, lineHeight: 20 },
  empty: { marginTop: Spacing.xl },
});
