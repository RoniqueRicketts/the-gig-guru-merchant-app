import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { confirmAction } from '@/components/appointment-card';
import { GatedOrError } from '@/components/gated-state';
import { Banner, Button, EmptyState, Icon, ListGroup, ListRow, Screen, SectionTitle, SkeletonList, StatusBadge, useToast } from '@/components/ui';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { dateLabel, get, money, relativeDay, rows, str, timeLabel, type Row } from '@/lib/format';
import { coordsOf, openInMaps, placeLabel } from '@/lib/maps';
import { safeMessage } from '@/lib/security';

/** Delivery status → plain-language label and the badge tone of a comparable status. */
const deliveryStatus: Record<string, { label: string; tone: string }> = {
  Open: { label: 'Finding courier', tone: 'Pending' },
  Assigned: { label: 'Courier assigned', tone: 'Processing' },
  PickedUp: { label: 'On the way', tone: 'Shipped' },
  Delivered: { label: 'Delivered', tone: 'Delivered' },
  Cancelled: { label: 'Cancelled', tone: 'Canceled' },
};



function DeliveryBadge({ status }: { status: unknown }) {
  const entry = deliveryStatus[str(status)];
  return <StatusBadge label={entry?.label ?? 'Delivery'} status={entry?.tone ?? 'neutral'} />;
}

export default function DeliveriesScreen() {
  const toast = useToast();
  const query = useQuery<Row>('/deliveries');
  const [busy, setBusy] = useState<string | null>(null);

  const outgoing = rows(query.data?.outgoing);
  const ready = rows(query.data?.ready);

  const run = async (key: string, task: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await task();
      toast.success(done);
      await query.reload();
    } catch (cause) {
      toast.error(safeMessage(cause));
    } finally {
      setBusy(null);
    }
  };

  const requestCourier = (orderNumber: string) =>
    void run(`ready:${orderNumber}`, () => request('/deliveries', { method: 'POST', body: { orderNumber } }), `Courier requested for #${orderNumber}`);

  const cancel = (row: Row) =>
    confirmAction('Cancel this delivery?', 'The courier job is withdrawn. You can request a new courier later.', 'Cancel delivery', () =>
      void run(`cancel:${str(row.id)}`, () => request(`/deliveries/${seg(str(row.id))}/status`, { method: 'PATCH', body: { status: 'Cancelled' } }), 'Delivery cancelled')
    );

  return (
    <Screen
      edges={['left', 'right']}
      refreshControl={<RefreshControl onRefresh={() => void query.refresh()} refreshing={query.refreshing} tintColor={Colors.primary} />}>
      {query.loading ? (
        <SkeletonList count={4} />
      ) : query.error && !query.data ? (
        <GatedOrError feature="Deliveries" icon="truck" message={query.error} onRetry={() => void query.refresh()} status={query.errorStatus} />
      ) : (
        <>
          {query.error ? <Banner message={query.error} /> : null}

          <SectionTitle title="Ready for a courier" />
          {ready.length ? (
            <ListGroup>
              {ready.map((row) => {
                const number = str(row.merchantOrderNumber);
                return (
                  <ListRow
                    icon="order"
                    key={str(row.id) || number}
                    onPress={() => router.push({ pathname: '/orders/[id]', params: { id: number } })}
                    subtitle={`${money(row.totalAmount, row.currency)} · ${dateLabel(row.createdAt)}`}
                    title={`Order #${number}`}
                    trailing={
                      <Button label="Request" loading={busy === `ready:${number}`} onPress={() => requestCourier(number)} size="md" />
                    }
                    chevron={false}
                  />
                );
              })}
            </ListGroup>
          ) : (
            <View style={styles.note}>
              <Text style={Type.caption}>Paid orders that ship will appear here when they need a courier.</Text>
            </View>
          )}

          <SectionTitle title="Active deliveries" />
          {outgoing.length ? (
            outgoing.map((row) => <DeliveryCard busy={busy === `cancel:${str(row.id)}`} key={str(row.id)} onCancel={() => cancel(row)} row={row} />)
          ) : (
            <EmptyState icon="truck" message="Deliveries you request show their courier and progress here." title="Nothing on the road" />
          )}
        </>
      )}
    </Screen>
  );
}

function DeliveryCard({ row, busy, onCancel }: { row: Row; busy: boolean; onCancel: () => void }) {
  const status = str(row.status);
  const number = str(get(row, 'merchantOrder', 'merchantOrderNumber'));
  const courier = str(get(row, 'courier', 'user', 'fullname'));
  const phone = str(get(row, 'courier', 'user', 'telephone'));
  const vehicle = [str(get(row, 'courier', 'vehicleType')), str(get(row, 'courier', 'vehicle'))].filter(Boolean).join(' · ');
  const provider = str(get(row, 'provider', 'name'));
  const canCancel = status === 'Open' || status === 'Assigned';
  const when = status === 'PickedUp' ? row.pickedUpAt : status === 'Assigned' ? row.assignedAt : row.createdAt;
  // Route and courier position come straight from the API's delivery record.
  const pickup = placeLabel(get(row, 'merchantOrder', 'pickupAddress'));
  const dropoff = placeLabel(get(row, 'merchantOrder', 'order', 'deliveryAddress'));
  const courierPin = coordsOf(row, 'courier');

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.cardIcon}><Icon color={Colors.primary} name="truck" size={20} /></View>
        <View style={styles.flex}>
          <Text style={Type.headline}>{number ? `Order #${number}` : 'Delivery'}</Text>
          <Text style={Type.caption}>
            {relativeDay(when)} · {timeLabel(when)}
            {Number(row.distanceKm) ? ` · ${Number(row.distanceKm).toFixed(1)} km` : ''}
          </Text>
        </View>
        <DeliveryBadge status={status} />
      </View>

      {pickup || dropoff ? (
        <View style={styles.route}>
          <RouteStop label="Pickup" value={pickup || 'Your store'} />
          <View style={styles.routeLine} />
          <RouteStop label="Drop-off" value={dropoff || 'Customer address'} />
        </View>
      ) : null}

      {courier ? (
        <View style={styles.courier}>
          <View style={styles.flex}>
            <Text style={styles.courierName}>{courier}</Text>
            <Text style={Type.caption}>{[vehicle, provider].filter(Boolean).join(' · ') || 'Courier'}</Text>
          </View>
          {phone ? <Button icon="phone" label="Call" onPress={() => void Linking.openURL(`tel:${phone}`)} size="md" variant="secondary" /> : null}
        </View>
      ) : status === 'Open' ? (
        <Text style={[Type.caption, styles.finding]}>Looking for a nearby courier…</Text>
      ) : null}

      {courierPin && (status === 'Assigned' || status === 'PickedUp') ? (
        <Pressable
          accessibilityHint="Opens the courier's last reported position in Maps"
          accessibilityRole="button"
          onPress={() => void openInMaps(courierPin, courier || 'Courier')}
          style={({ pressed }) => [styles.locate, pressed && styles.pressed]}>
          <Icon color={Colors.primary} name="location" size={16} />
          <Text style={styles.locateText}>
            Courier location{row.courier && get(row, 'courier', 'locationAt') ? ` · updated ${timeLabel(get(row, 'courier', 'locationAt'))}` : ''}
          </Text>
          <Icon color={Colors.textFaint} name="chevron.right" size={14} />
        </Pressable>
      ) : null}

      <View style={styles.cardFoot}>
        <Text style={Type.caption}>Delivery fee {money(row.feeUsd, 'USD')}</Text>
        {canCancel ? (
          <Button label="Cancel" loading={busy} onPress={onCancel} size="md" variant="ghost" />
        ) : null}
      </View>
    </View>
  );
}

function RouteStop({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stop}>
      <View style={[styles.stopDot, label === 'Drop-off' && styles.stopDotEnd]} />
      <View style={styles.flex}>
        <Text style={styles.stopLabel}>{label.toUpperCase()}</Text>
        <Text numberOfLines={1} style={styles.stopValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pressed: { opacity: 0.7 },
  route: { marginTop: Spacing.md },
  routeLine: { width: 2, height: 12, backgroundColor: Colors.border, marginLeft: 4 },
  stop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  stopDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.background },
  stopDotEnd: { backgroundColor: Colors.primary },
  stopLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: Colors.textFaint },
  stopValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  locate: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, minHeight: 44, marginTop: Spacing.sm },
  locateText: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.primary },
  note: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg },
  card: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.tint, alignItems: 'center', justifyContent: 'center' },
  courier: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md, padding: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md },
  courierName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  finding: { marginTop: Spacing.md },
  cardFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm, minHeight: 44 },
});
