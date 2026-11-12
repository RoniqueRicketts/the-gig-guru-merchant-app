import { router } from 'expo-router';
import { useCallback } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { GatedOrError } from '@/components/gated-state';
import { EmptyState, Icon, LoadingFooter, ripple, SkeletonList } from '@/components/ui';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { usePagedList } from '@/hooks/use-api';
import { qs } from '@/lib/api';
import { dateLabel, money, str, type Row } from '@/lib/format';

const PAGE = 25;

/** Receipts GigGuru issued for paid storefront sales (GET /issued-invoices?kind=Sale). */
export default function ReceiptsScreen() {
  const path = useCallback((offset: number) => `/issued-invoices${qs({ kind: 'Sale', limit: PAGE, offset })}`, []);
  const list = usePagedList<Row>(path, PAGE);

  if (list.loading) return <View style={styles.container}><SkeletonList count={6} /></View>;
  if (list.error && !list.items.length) {
    return <GatedOrError feature="Receipts" icon="receipt" message={list.error} onRetry={() => void list.refresh()} status={list.errorStatus} />;
  }

  return (
    <FlatList
          contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.list}
      data={list.items}
      keyExtractor={(row, index) => str(row.id) || String(index)}
      ListEmptyComponent={<EmptyState icon="receipt" message="When a customer pays for an order, its receipt is filed here automatically." title="No receipts yet" />}
      ListFooterComponent={<LoadingFooter visible={list.loadingMore} />}
      onEndReached={() => void list.loadMore()}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl onRefresh={() => void list.refresh()} refreshing={list.refreshing} tintColor={Colors.primary} />}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/receipts/[id]', params: { id: str(item.id) } })}
          android_ripple={ripple}
          style={({ pressed }) => [styles.row, Platform.OS === 'ios' && pressed && styles.rowPressed]}>
          <View style={styles.rowIcon}><Icon color={Colors.primary} name="receipt" size={20} /></View>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.rowTitle}>{str(item.buyerName) || 'Customer'}</Text>
            <Text numberOfLines={1} style={styles.rowSub}>
              {str(item.number) || 'Receipt'} · {dateLabel(item.paidAt, { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>
          <Text style={styles.amount}>{money(item.total, item.currency)}</Text>
        </Pressable>
      )}
      style={styles.root}
    />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { backgroundColor: Colors.card },
  container: { flex: 1, backgroundColor: Colors.card, paddingHorizontal: Spacing.lg },
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingVertical: Spacing.sm, paddingBottom: Spacing.xxxl, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 72 },
  rowPressed: { backgroundColor: Colors.surface },
  rowIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', color: Colors.text },
});
