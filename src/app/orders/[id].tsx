import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { confirmAction } from '@/components/appointment-card';
import { Banner, Button, ErrorState, ListGroup, ListRow, Screen, SkeletonList, StatusBadge, useToast } from '@/components/ui';
import { type SettableOrderStatus } from '@/constants/enums';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { dateLabel, money, order, rows, str, type Row } from '@/lib/format';
import { isHttpsUrl, safeMessage } from '@/lib/security';

/** The one obvious next step for an order, using only statuses the API lets merchants set. */
function nextStep(status: string): { status: SettableOrderStatus; label: string; done: string } | null {
  if (status === 'Pending') return { status: 'Processing', label: 'Start processing', done: 'Order is processing' };
  if (status === 'Processing') return { status: 'Awaiting_Shipment', label: 'Ready to ship', done: 'Marked ready to ship' };
  return null;
}

const cancellable = new Set(['Awaiting_Payment', 'Pending', 'Processing', 'Awaiting_Shipment']);

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const query = useQuery<Row>(id ? `/orders/${seg(id)}` : null);
  const [busy, setBusy] = useState<string | null>(null);

  if (query.loading) return <Screen><SkeletonList count={4} /></Screen>;
  if (!query.data) return <ErrorState message={query.error ?? "We couldn't find this order."} onRetry={() => void query.refresh()} />;

  const row = query.data;
  const status = str(row.status);
  const step = nextStep(status);
  const items = rows(row.orderItems);

  const run = async (kind: string, task: () => Promise<unknown>, done: string) => {
    setBusy(kind);
    try {
      await task();
      toast.success(done);
      await query.refresh();
    } catch (cause) {
      toast.error(safeMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        step ? (
          <Button
            label={step.label}
            loading={busy === 'status'}
            onPress={() => void run('status', () => request(`/orders/${seg(id)}/status`, { method: 'PATCH', body: { status: step.status } }), step.done)}
          />
        ) : undefined
      }
      refreshControl={<RefreshControl onRefresh={() => void query.refresh()} refreshing={query.refreshing} tintColor={Colors.primary} />}>
      <View style={styles.header}>
        <Text style={Type.caption}>Order #{order.number(row)}</Text>
        <Text style={styles.amount}>{money(row.totalAmount)}</Text>
        <StatusBadge status={status} />
      </View>

      {query.error ? <Banner message={query.error} /> : null}
      {status === 'Awaiting_Payment' ? <Banner message="Waiting for the customer's payment to clear. Don't ship yet." tone="warning" /> : null}

      <ListGroup>
        <ListRow icon="person" title={order.shopper(row)} />
        <ListRow icon="calendar" title="Placed" value={dateLabel(row.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })} />
        <ListRow icon="truck" title={row.shippable === false ? 'Pickup' : 'Delivery'} value={str(row.trackingNumber) || undefined} />
      </ListGroup>

      <ListGroup style={styles.group} title={`${items.length} item${items.length === 1 ? '' : 's'}`}>
        {items.map((item, index) => {
          const image = str(item.imageSrc);
          return (
            <ListRow
              key={str(item.id) || index}
              leading={
                isHttpsUrl(image) ? (
                  <Image accessibilityIgnoresInvertColors contentFit="cover" source={{ uri: image }} style={styles.thumb} />
                ) : undefined
              }
              subtitle={[`Qty ${str(item.quantity) || '1'}`, str(item.size), str(item.color)].filter(Boolean).join(' · ')}
              title={str(item.name) || 'Item'}
              value={money(item.totalPrice)}
            />
          );
        })}
      </ListGroup>

      <ListGroup style={styles.group} title="Summary">
        <ListRow title="Subtotal" value={money(row.subtotal)} />
        {Number(row.shippingFee) ? <ListRow title="Shipping" value={money(row.shippingFee)} /> : null}
        {Number(row.tax) ? <ListRow title="Tax" value={money(row.tax)} /> : null}
        <ListRow title="Total" value={money(row.totalAmount)} />
      </ListGroup>

      {cancellable.has(status) ? (
        <ListGroup style={styles.group}>
          <ListRow
            destructive
            icon="cancel"
            onPress={() =>
              confirmAction('Cancel this order?', 'The customer will be notified that the order was canceled.', 'Cancel order', () =>
                void run('cancel', () => request(`/orders/${seg(id)}/cancel`, { method: 'POST' }), 'Order canceled')
              )
            }
            title={busy === 'cancel' ? 'Canceling…' : 'Cancel order'}
          />
        </ListGroup>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  amount: { fontSize: 40, fontWeight: '800', letterSpacing: -1, color: Colors.text },
  group: { marginTop: Spacing.xxl },
  thumb: { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.surface },
});
