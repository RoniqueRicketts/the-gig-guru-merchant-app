import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';

import { confirmAction } from '@/components/appointment-card';
import { Banner, Button, ErrorState, ListGroup, ListRow, Screen, SkeletonList, StatusBadge, useToast } from '@/components/ui';
import type { SendVia } from '@/constants/enums';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { dateLabel, get, invoice, money, rows, str, type Row } from '@/lib/format';
import { currentCatalog } from '@/lib/catalog';
import { safeMessage } from '@/lib/security';

/** Backend stores SendVia as Email | Telephone | Both; the resend route takes email | sms | both. */
function resendChannel(value: unknown): SendVia {
  const stored = str(value);
  const channel = stored === 'Email' ? 'email' : stored === 'Telephone' ? 'sms' : 'both';
  // Fall back to a channel the API's catalog lists if this one isn't accepted.
  const accepted = currentCatalog()?.sendVia ?? [];
  return accepted.includes(channel) ? channel : accepted.includes('both') ? 'both' : accepted[0] ?? channel;
}

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const query = useQuery<Row>(id ? `/invoices/${seg(id)}` : null);
  const [busy, setBusy] = useState<'resend' | 'cancel' | null>(null);

  if (query.loading) return <Screen><SkeletonList count={4} /></Screen>;
  if (!query.data) return <ErrorState message={query.error ?? "We couldn't find this invoice."} onRetry={() => void query.refresh()} />;

  const row = query.data;
  const status = str(row.status);
  const closed = status === 'Paid' || status === 'Cancelled';
  const items = rows(row.items);
  const customer = invoice.customer(row);
  const channel = resendChannel(row.sendVia);

  const act = async (kind: 'resend' | 'cancel') => {
    setBusy(kind);
    try {
      if (kind === 'resend') {
        await request(`/invoices/${seg(id)}/resend`, { method: 'POST', body: { sendVia: channel } });
        toast.success(`Reminder sent to ${customer}`);
      } else {
        await request(`/invoices/${seg(id)}/cancel`, { method: 'POST' });
        toast.success('Invoice canceled');
      }
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
        closed ? undefined : (
          <Button icon="send" label="Send reminder" loading={busy === 'resend'} onPress={() => void act('resend')} />
        )
      }
      refreshControl={<RefreshControl onRefresh={() => void query.refresh()} refreshing={query.refreshing} tintColor={Colors.primary} />}>
      <View style={styles.header}>
        <Text style={Type.caption}>{invoice.number(row)}</Text>
        <Text style={styles.amount}>{money(row.total, row.currency)}</Text>
        <StatusBadge label={status === 'Sent' ? 'Unpaid' : undefined} status={status} />
      </View>

      {query.error ? <Banner message={query.error} /> : null}

      <ListGroup>
        <ListRow icon="person" subtitle={str(get(row, 'customer', 'email')) || undefined} title={customer} />
        <ListRow icon="calendar" title="Due" value={dateLabel(row.dueDate, { month: 'long', day: 'numeric', year: 'numeric' })} />
        {row.paidDate ? <ListRow icon="check.circle" title="Paid" value={dateLabel(row.paidDate)} /> : null}
        {row.sentDate ? <ListRow icon="send" title="Sent" value={dateLabel(row.sentDate)} /> : null}
      </ListGroup>

      {items.length ? (
        <ListGroup style={styles.group} title="Items">
          {items.map((item, index) => {
            const quantity = Number(item.quantity) || 1;
            const unit = item.unitPrice ?? item.price;
            return (
              <ListRow
                key={str(item.id) || index}
                subtitle={`${quantity} × ${money(unit, row.currency)}`}
                title={str(item.name) || 'Item'}
                value={money(item.totalPrice ?? Number(unit) * quantity, row.currency)}
              />
            );
          })}
        </ListGroup>
      ) : null}

      {str(row.notes) ? <Text style={[Type.caption, styles.notes]}>{str(row.notes)}</Text> : null}

      {!closed ? (
        <ListGroup style={styles.group}>
          <ListRow
            destructive
            icon="cancel"
            onPress={() => confirmAction('Cancel this invoice?', `${customer} will no longer be able to pay it.`, 'Cancel invoice', () => void act('cancel'))}
            title={busy === 'cancel' ? 'Canceling…' : 'Cancel invoice'}
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
  notes: { marginTop: Spacing.lg, lineHeight: 19 },
});
