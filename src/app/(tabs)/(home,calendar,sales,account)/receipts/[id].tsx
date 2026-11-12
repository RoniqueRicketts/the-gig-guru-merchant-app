import { useLocalSearchParams } from 'expo-router';
import { RefreshControl, Share, StyleSheet, Text, View } from 'react-native';

import { Banner, Button, ErrorState, ListGroup, ListRow, Screen, SkeletonList, StatusBadge } from '@/components/ui';
import { Colors, Spacing, Type } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { seg } from '@/lib/api';
import { dateLabel, money, rows, str, type Row } from '@/lib/format';

/** A paid receipt: an immutable snapshot with one section per seller (always one for a Sale). */
export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery<Row>(id ? `/issued-invoices/${seg(id)}` : null);

  if (query.loading) return <Screen edges={['left', 'right']}><SkeletonList count={5} /></Screen>;
  if (!query.data) return <ErrorState message={query.error ?? "We couldn't find this receipt."} onRetry={() => void query.refresh()} />;

  const row = query.data;
  const sections = rows(row.sections);
  const paid = dateLabel(row.paidAt, { month: 'long', day: 'numeric', year: 'numeric' });

  const share = () => {
    const lines = sections.flatMap((section) => [
      ...rows(section.items).map((item) => `${str(item.quantity) || '1'} × ${str(item.name)}  ${money(item.total, section.currency)}`),
      `Total  ${money(section.total, section.currency)}`,
    ]);
    void Share.share({ message: [`Receipt ${str(row.number)}`, `Paid ${paid}`, '', ...lines].join('\n') });
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={<Button icon="send" label="Share receipt" onPress={share} variant="secondary" />}
      refreshControl={<RefreshControl onRefresh={() => void query.refresh()} refreshing={query.refreshing} tintColor={Colors.primary} />}>
      <View style={styles.header}>
        <Text style={Type.caption}>{str(row.number) || 'Receipt'}</Text>
        <Text style={styles.amount}>{money(row.total, row.currency)}</Text>
        <StatusBadge label="Paid" status="Paid" />
      </View>
      {query.error ? <Banner message={query.error} /> : null}

      <ListGroup>
        <ListRow icon="person" title={str(row.buyerName) || 'Customer'} />
        <ListRow icon="calendar" title="Paid" value={paid} />
      </ListGroup>

      {sections.map((section, sectionIndex) => {
        const currency = section.currency;
        const items = rows(section.items);
        return (
          <View key={str(section.reference) || sectionIndex}>
            <ListGroup style={styles.group} title={str(section.reference) ? `Order #${str(section.reference)}` : 'Items'}>
              {items.map((item, index) => (
                <ListRow
                  key={index}
                  subtitle={[`${str(item.quantity) || '1'} × ${money(item.unitPrice, currency)}`, str(item.variant)].filter(Boolean).join(' · ')}
                  title={str(item.name) || 'Item'}
                  value={money(item.total, currency)}
                />
              ))}
            </ListGroup>
            <ListGroup style={styles.group} title="Summary">
              <ListRow title="Subtotal" value={money(section.subtotal, currency)} />
              {Number(section.discount) ? <ListRow title="Discount" value={`−${money(section.discount, currency)}`} /> : null}
              {Number(section.shipping) ? <ListRow title="Delivery" value={money(section.shipping, currency)} /> : null}
              {Number(section.tax) ? <ListRow title="Tax" value={money(section.tax, currency)} /> : null}
              <ListRow title="Total" value={money(section.total, currency)} />
              {section.totalUsd != null && str(currency).toUpperCase() !== 'USD' ? <ListRow title="Charged" value={money(section.totalUsd, 'USD')} /> : null}
            </ListGroup>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  amount: { fontSize: 40, fontWeight: '800', letterSpacing: -1, color: Colors.text },
  group: { marginTop: Spacing.xxl },
});
