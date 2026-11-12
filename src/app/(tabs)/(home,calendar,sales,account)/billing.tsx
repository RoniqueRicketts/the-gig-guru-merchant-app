import { RefreshControl, StyleSheet } from 'react-native';

import { EmptyState, ErrorState, ListGroup, ListRow, Screen, SkeletonList, StatusBadge } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { money, rows, str, type Row } from '@/lib/format';

/** GigGuru plan payments (Stripe invoices). Amounts arrive in minor units; dates in Unix seconds. */
export default function BillingScreen() {
  const query = useQuery<Row[]>('/payments');
  const items = rows(query.data);

  return (
    <Screen
      edges={['left', 'right']}
      refreshControl={<RefreshControl onRefresh={() => void query.refresh()} refreshing={query.refreshing} tintColor={Colors.primary} />}>
      {query.loading ? (
        <SkeletonList count={4} />
      ) : query.error && !items.length ? (
        <ErrorState message={query.error} onRetry={() => void query.refresh()} />
      ) : items.length ? (
        <ListGroup style={styles.group}>
          {items.map((row, index) => {
            const created = Number(row.created);
            return (
              <ListRow
                icon="payment"
                key={str(row.id) || index}
                subtitle={Number.isFinite(created) ? new Date(created * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : undefined}
                title={str(row.description) || 'GigGuru subscription'}
                trailing={<StatusBadge status={str(row.status) === 'paid' ? 'Paid' : row.status} />}
                value={money(Number(row.amount_paid) / 100, row.currency)}
              />
            );
          })}
        </ListGroup>
      ) : (
        <EmptyState icon="payment" message="Your GigGuru plan payments will appear here." title="No billing history" />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { marginTop: Spacing.lg } });
