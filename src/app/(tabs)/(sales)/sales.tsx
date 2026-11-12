import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import {
  ErrorState,
  EmptyState,
  FilterChips,
  Icon,
  LoadingFooter,
  Segmented,
  SkeletonList,
  ripple,
  StatusBadge,
} from '@/components/ui';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { usePagedList } from '@/hooks/use-api';
import { enumLabel } from '@/constants/enums';
import { useCatalog } from '@/lib/catalog';
import { qs } from '@/lib/api';
import { dateLabel, invoice, money, order, str, toDate, type Row } from '@/lib/format';

type Tab = 'orders' | 'invoices';

/** Friendlier names for some API statuses; everything else uses the API value's own label. */
const filterLabels: Record<string, string> = {
  Awaiting_Payment: 'Awaiting payment',
  Pending: 'To process',
  Awaiting_Shipment: 'Ready to ship',
  Sent: 'Unpaid',
};

/** Filter chips are exactly the statuses the API lists in GET /meta. */
function filtersFor(statuses: string[]) {
  return [{ value: 'all', label: 'All' }, ...statuses.map((value) => ({ value, label: filterLabels[value] ?? enumLabel(value) }))];
}

export default function SalesScreen() {
  const params = useLocalSearchParams<{ tab?: string; filter?: string }>();
  const [tab, setTab] = useState<Tab>('orders');
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const catalog = useCatalog();
  const orderFilters = useMemo(() => filtersFor(catalog.orderStatuses), [catalog.orderStatuses]);
  const invoiceFilters = useMemo(() => filtersFor(catalog.invoiceStatuses), [catalog.invoiceStatuses]);

  // Deep links (e.g. Home's "3 orders to process") pick the tab and filter.
  const linkKey = `${params.tab ?? ''}:${params.filter ?? ''}`;
  const [appliedLink, setAppliedLink] = useState('');
  if (linkKey !== appliedLink) {
    setAppliedLink(linkKey);
    if (params.tab === 'orders' || params.tab === 'invoices') {
      setTab(params.tab);
      setSearch('');
      const options = params.tab === 'orders' ? orderFilters : invoiceFilters;
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

  const searchPlaceholder = tab === 'orders' ? 'Order # or customer' : 'Invoice # or customer';

  const header = (
    <View style={styles.container}>
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
      {tab === 'orders' ? (
        <FilterChips onChange={setOrderFilter} options={orderFilters} value={orderFilter} />
      ) : (
        <FilterChips onChange={setInvoiceFilter} options={invoiceFilters} value={invoiceFilter} />
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: searchPlaceholder,
            autoCapitalize: 'none',
            hideWhenScrolling: false,
            tintColor: Colors.primary,
            onChangeText: (event) => setSearch(event.nativeEvent.text),
            onCancelButtonPress: () => setSearch(''),
          },
        }}
      />
      <FlatList
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        data={list.loading || (list.error && !list.items.length) ? [] : visible}
        ItemSeparatorComponent={Separator}
        keyboardDismissMode="on-drag"
        keyExtractor={(row, index) => str(row.id) || String(index)}
        ListEmptyComponent={
          list.loading ? (
            <View style={styles.container}><SkeletonList count={6} /></View>
          ) : list.error && !list.items.length ? (
            <ErrorState message={list.error} onRetry={() => void list.refresh()} />
          ) : tab === 'orders' ? (
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
        ListHeaderComponent={header}
        onEndReached={() => void list.loadMore()}
        onEndReachedThreshold={0.4}
        refreshControl={<RefreshControl onRefresh={() => void list.refresh()} refreshing={list.refreshing} tintColor={Colors.primary} />}
        renderItem={({ item }) => (tab === 'orders' ? <OrderRow row={item} /> : <InvoiceRow row={item} />)}
        style={styles.root}
      />
    </>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

function OrderRow({ row }: { row: Row }) {
  const number = order.number(row);
  const items = order.itemCount(row);
  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={ripple}
      onPress={() => router.push({ pathname: '/orders/[id]', params: { id: number } })}
      style={({ pressed }) => [styles.row, Platform.OS === 'ios' && pressed && styles.rowPressed]}>
      <View style={styles.rowIcon}><Icon color={Colors.primary} name="order" size={20} /></View>
      <View style={styles.flex}>
        <Text numberOfLines={1} style={styles.rowTitle}>{order.shopper(row)}</Text>
        <Text numberOfLines={1} style={styles.rowSub}>
          #{number} · {items} item{items === 1 ? '' : 's'} · {dateLabel(row.createdAt)}
        </Text>
      </View>
      <View style={styles.rowEnd}>
        <Text style={styles.amount}>{money(row.totalAmount, row.currency)}</Text>
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
      android_ripple={ripple}
      onPress={() => router.push({ pathname: '/invoices/[id]', params: { id: str(row.id) } })}
      style={({ pressed }) => [styles.row, Platform.OS === 'ios' && pressed && styles.rowPressed]}>
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
  root: { flex: 1, backgroundColor: Colors.card },
  container: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 72 },
  list: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', paddingBottom: Spacing.xxxl, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 68 },
  rowPressed: { backgroundColor: Colors.surface },
  rowIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  rowEnd: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 15, fontWeight: '700', color: Colors.text },
});
