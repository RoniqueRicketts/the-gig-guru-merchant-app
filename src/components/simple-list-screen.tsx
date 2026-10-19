import { router, Stack, type Href } from 'expo-router';
import { type ReactNode } from 'react';
import { RefreshControl, StyleSheet } from 'react-native';

import { EmptyState, ErrorState, IconButton, ListGroup, Screen, SkeletonList, type IconName } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { rows, type Row } from '@/lib/format';

/** Small, unpaginated collections (locations, addresses) rendered as a grouped list. */
export function SimpleListScreen({
  path,
  addHref,
  addLabel,
  emptyIcon,
  emptyTitle,
  emptyMessage,
  renderRow,
}: {
  path: string;
  addHref: Href;
  addLabel: string;
  emptyIcon: IconName;
  emptyTitle: string;
  emptyMessage: string;
  renderRow: (row: Row, refresh: () => Promise<void>) => ReactNode;
}) {
  const query = useQuery<Row[]>(path);
  const items = rows(query.data);

  return (
    <Screen
      edges={['left', 'right']}
      refreshControl={<RefreshControl onRefresh={() => void query.refresh()} refreshing={query.refreshing} tintColor={Colors.primary} />}>
      <Stack.Screen options={{ headerRight: () => <IconButton icon="plus" label={addLabel} onPress={() => router.push(addHref)} /> }} />
      {query.loading ? (
        <SkeletonList count={3} />
      ) : query.error && !items.length ? (
        <ErrorState message={query.error} onRetry={() => void query.refresh()} />
      ) : items.length ? (
        <ListGroup style={styles.group}>{items.map((row) => renderRow(row, query.refresh))}</ListGroup>
      ) : (
        <EmptyState action={addLabel} icon={emptyIcon} message={emptyMessage} onAction={() => router.push(addHref)} title={emptyTitle} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { marginTop: Spacing.lg } });
