import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { confirmAction } from '@/components/appointment-card';
import { Banner, Button, ErrorState, ListGroup, ListRow, Screen, SkeletonList, StatusBadge, useToast } from '@/components/ui';
import { type SettableOrderStatus } from '@/constants/enums';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { dateLabel, get, money, order, rows, statusLabel, str, timeLabel, toDate, type Row } from '@/lib/format';
import { allows } from '@/lib/catalog';
import { coordsOf, openInMaps } from '@/lib/maps';
import { isHttpsUrl, safeMessage } from '@/lib/security';

/** The one obvious next step for an order, using only statuses the API lets merchants set. */
function nextStep(status: string): { status: SettableOrderStatus; label: string; done: string } | null {
  let step: { status: SettableOrderStatus; label: string; done: string } | null = null;
  if (status === 'Pending') step = { status: 'Processing', label: 'Start processing', done: 'Order is processing' };
  if (status === 'Processing') step = { status: 'Awaiting_Shipment', label: 'Ready to ship', done: 'Marked ready to ship' };
  // Offer the step only if PATCH /orders/{id}/status accepts it (settableOrderStatuses from GET /meta).
  return step && allows('settableOrderStatuses', step.status) ? step : null;
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
  // Everything below is the API's merchant order: its own currency, tracking timeline and pickup point.
  const currency = row.currency;
  const timeline = [...rows(row.tracking)].sort((a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0));
  const pickup = (get(row, 'pickupAddress') as Row | undefined) ?? null;
  const pickupPin = coordsOf(pickup);
  const trackingUrl = str(row.trackingUrl);

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
        <Text style={styles.amount}>{money(row.totalAmount, currency)}</Text>
        <StatusBadge status={status} />
      </View>

      {query.error ? <Banner message={query.error} /> : null}
      {status === 'Awaiting_Payment' ? <Banner message="Waiting for the customer's payment to clear. Don't ship yet." tone="warning" /> : null}

      <ListGroup>
        <ListRow icon="person" title={order.shopper(row)} />
        <ListRow icon="calendar" title="Placed" value={dateLabel(row.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })} />
        <ListRow icon="truck" title={row.shippable === false ? 'Pickup' : 'Delivery'} value={str(row.trackingNumber) || undefined} />
        {str(row.shippingProvider) ? <ListRow icon="truck" title="Carrier" value={str(row.shippingProvider)} /> : null}
        {isHttpsUrl(trackingUrl) ? <ListRow icon="send" onPress={() => void Linking.openURL(trackingUrl)} title="Track shipment" /> : null}
        {pickup ? (
          <ListRow
            icon="location"
            onPress={pickupPin ? () => void openInMaps(pickupPin, str(pickup.name) || 'Pickup') : undefined}
            subtitle={[str(pickup.line1), str(pickup.city)].filter(Boolean).join(', ') || undefined}
            title={str(pickup.name) || 'Pickup point'}
            value={pickupPin ? 'Map' : undefined}
          />
        ) : null}
      </ListGroup>

      {timeline.length ? (
        <ListGroup style={styles.group} title="Tracking">
          {timeline.map((event, index) => {
            const pin = coordsOf(event);
            return (
              <ListRow
                icon={index === 0 ? 'check.circle' : 'clock'}
                iconColor={index === 0 ? Colors.primary : Colors.textFaint}
                key={str(event.id) || index}
                onPress={pin ? () => void openInMaps(pin, statusLabel(event.status)) : undefined}
                subtitle={[str(event.details), `${dateLabel(event.createdAt)} · ${timeLabel(event.createdAt)}`].filter(Boolean).join(' · ')}
                title={statusLabel(event.status)}
              />
            );
          })}
        </ListGroup>
      ) : null}

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
              value={money(item.totalPrice, currency)}
            />
          );
        })}
      </ListGroup>

      <ListGroup style={styles.group} title="Summary">
        <ListRow title="Subtotal" value={money(row.subtotal, currency)} />
        {Number(row.shippingFee) ? <ListRow title="Shipping" value={money(row.shippingFee, currency)} /> : null}
        {Number(row.tax) ? <ListRow title="Tax" value={money(row.tax, currency)} /> : null}
        <ListRow title="Total" value={money(row.totalAmount, currency)} />
      </ListGroup>

      {row.shippable !== false && allows('deliverableOrderStatuses', status) ? (
        <ListGroup style={styles.group} title="Delivery">
          <ListRow
            icon="truck"
            onPress={() =>
              void run(
                'courier',
                () => request('/deliveries', { method: 'POST', body: { orderNumber: order.number(row) } }),
                'Courier requested. Track it in Deliveries.'
              )
            }
            subtitle="Send this order to a GigGuru courier"
            title={busy === 'courier' ? 'Requesting…' : 'Request a courier'}
          />
          <ListRow icon="location" onPress={() => router.push('/deliveries')} title="Track deliveries" />
        </ListGroup>
      ) : null}

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
