import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ErrorState,
  EmptyState,
  FilterChips,
  Icon,
  IconButton,
  LargeHeader,
  LoadingFooter,
  Segmented,
  SkeletonList,
  StatusBadge,
} from '@/components/ui';
import { Colors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { usePagedList } from '@/hooks/use-api';
import { qs } from '@/lib/api';
import { dateLabel, invoice, money, order, str, toDate, type Row } from '@/lib/format';

type Tab = 'orders' | 'invoices';

const orderFilters = [
  { value: 'all', label: 'All' },
  { value: 'Pending', label: 'To process' },
  { value: 'Processing', label: 'Processing' },
  { value: 'Awaiting_Shipment', label: 'Ready to ship' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Canceled', label: 'Canceled' },
] as const;

const invoiceFilters = [
  { value: 'all', label: 'All' },
  { value: 'Overdue', label: 'Overdue' },
  { value: 'Sent', label: 'Unpaid' },
  { value: 'Paid', label: 'Paid' },
] as const;

export default function SalesScreen() {
  const params = useLocalSearchParams<{ tab?: string; filter?: string }>();
  const [tab, setTab] = useState<Tab>('orders');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Deep links (e.g. Home's "3 orders to process") pick the tab and filter.
  const linkKey = `${params.tab ?? ''}:${params.filter ?? ''}`;
  const [appliedLink, setAppliedLink] = useState('');
  if (linkKey !== appliedLink) {
    setAppliedLink(linkKey);
    if (params.tab === 'orders' || params.tab === 'invoices') {
      setTab(params.tab);
      setSearch('');
      const options: readonly { value: string }[] = params.tab === 'orders' ? orderFilters : invoiceFilters;
      const filter = options.some((option) => option.value === params.filter) ? params.filter! : 'all';
      if (params.tab === 'orders') setOrderFilter(filter);
      else setInvoiceFilter(filter);
    }
  }

  const ordersPath = useCallback(
    (offset: number) => `/orders${qs({ skip: offset, status: orderFilter === 'all' ? undefined : orderFilter })}`,
    [orderFilter]
  );
  const invoicesPath = useCallback((offset: number) => `/invoices${qs({ skip: offset })}`, []);

  const orders = usePagedList<Row>(tab === 'orders' ? ordersPath : null, 20);
  const invoices = usePagedList<Row>(tab === 'invoices' ? invoicesPath : null, 50);
  const list = tab === 'orders' ? orders : invoices;

  // The invoices API has no server-side filter/search, so filter the loaded pages locally.
  const visible = useMemo(() => {
    let rows = list.items;
    if (tab === 'invoices' && invoiceFilter !== 'all') rows = rows.filter((row) => str(row.status) === invoiceFilter);
    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter((row) =>
        (tab === 'orders'
          ? `${order.number(row)} ${order.shopper(row)}`
          : `${invoice.number(row)} ${invoice.customer(row)}`
        ).toLowerCase().includes(term)
      );
    }
    return rows;
  }, [list.items, tab, invoiceFilter, search]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <View style={styles.container}>
        <LargeHeader
          right={
            tab === 'invoices' ? <IconButton icon="plus" label="New invoice" onPress={() => router.push('/invoices/new')} variant="filled" /> : null
          }
          title="Sales"
        />
        <Segmented
          onChange={(value) => {
            setTab(value);
            setSearch('');
          }}
          options={[
            { value: 'orders', label: 'Orders' },
            { value: 'invoices', label: 'Invoices' },
          ]}
          value={tab}
        />
        <View style={styles.search}>
          <Icon color={Colors.textFaint} name="search" size={16} />
          <TextInput
            accessibilityLabel={`Search ${tab}`}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            maxLength={80}
            onChangeText={setSearch}
            placeholder={tab === 'orders' ? 'Search order # or customer' : 'Search invoice # or customer'}
            placeholderTextColor={Colors.textFaint}
            returnKeyType="search"
            style={styles.searchInput}
            value={search}
          />
        </View>
        {tab === 'orders' ? (
          <FilterChips onChange={setOrderFilter} options={[...orderFilters]} value={orderFilter} />
        ) : (
          <FilterChips onChange={setInvoiceFilter} options={[...invoiceFilters]} value={invoiceFilter} />
        )}
      </View>

      {list.loading ? (
        <View style={styles.container}><SkeletonList count={6} /></View>
      ) : list.error && !list.items.length ? (
        <ErrorState message={list.error} onRetry={() => void list.refresh()} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={visible}
          keyExtractor={(row, index) => str(row.id) || String(index)}
          ListEmptyComponent={
            tab === 'orders' ? (
              <EmptyState icon="order" message="When customers buy from you, their orders appear here." title={search ? 'No matches' : 'No orders'} />
            ) : (
              <EmptyState
                action={search ? undefined : 'Create invoice'}
                icon="invoice"
                message={search ? 'Try a different search.' : 'Bill a customer in under a minute.'}
                onAction={() => router.push('/invoices/new')}
                title={search ? 'No matches' : 'No invoices'}
              />
            )
          }
          ListFooterComponent={<LoadingFooter visible={list.loadingMore} />}
          onEndReached={() => void list.loadMore()}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl onRefresh={() => void list.refresh()} refreshing={list.refreshing} tintColor={Colors.primary} />}
          renderItem={({ item }) => (tab === 'orders' ? <OrderRow row={item} /> : <InvoiceRow row={item} />)}
        />
      )}
    </SafeAreaView>
  );
}

function OrderRow({ row }: { row: Row }) {
  const number = order.number(row);
  const items = order.itemCount(row);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: number } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowIcon}><Icon color={Colors.primary} name="order" size={20} /></View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.rowTitle}>{order.shopper(row)}</Text>
        <Text numberOfLines={1} style={styles.rowSub}>
          #{number} · {items} item{items === 1 ? '' : 's'} · {dateLabel(row.createdAt)}
        </Text>
      </View>
      <View style={styles.rowEnd}>
        <Text style={styles.amount}>{money(row.totalAmount)}</Text>
        <StatusBadge status={row.status} />
      </View>
    </Pressable>
  );
}

function InvoiceRow({ row }: { row: Row }) {
  const status = str(row.status);
  const due = toDate(row.dueDate);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/invoices/[id]', params: { id: str(row.id) } })}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowIcon}><Icon color={Colors.primary} name="invoice" size={20} /></View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.rowTitle}>{invoice.customer(row)}</Text>
        <Text numberOfLines={1} style={styles.rowSub}>
          {invoice.number(row)}
          {due ? ` · Due ${dateLabel(row.dueDate)}` : ''}
        </Text>
      </View>
      <View style={styles.rowEnd}>
        <Text style={styles.amount}>{money(row.total, row.currency)}</Text>
        <StatusBadge status={status} label={status === 'Sent' ? 'Unpaid' : undefined} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 44,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 10 },
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingBottom: Spacing.xxxl, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 72 },
  rowPressed: { backgroundColor: Colors.surface },
  rowIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  rowEnd: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 15, fontWeight: '700', color: Colors.text },
});
