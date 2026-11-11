import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, ChoiceChips, Field, IconButton, Screen, Select, Stepper, useToast } from '@/components/ui';
import { enumLabel, type SendVia } from '@/constants/enums';
import { useCatalog } from '@/lib/catalog';
import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request } from '@/lib/api';
import { dayKey, money, rows, startingPrice, str, type Row } from '@/lib/format';
import { isE164, isEmail, normalizePhone, safeMessage } from '@/lib/security';

const sendViaLabels: Record<string, string> = { email: 'Email', sms: 'Text', both: 'Both' };

type Line = { key: string; id: string; category: 'Service' | 'Product'; name: string; price: number; quantity: number };

const dueOptions = [
  { value: '0', label: 'On receipt' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
];

function addDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dayKey(date);
}

export default function NewInvoiceScreen() {
  const toast = useToast();
  const { sendVia: sendViaOptions, itemCategories } = useCatalog();
  const services = useQuery<Row[]>('/services?limit=100');
  const products = useQuery<Row[]>('/products?limit=100');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [due, setDue] = useState('7');
  const [sendVia, setSendVia] = useState<SendVia>(sendViaOptions.includes('email') ? 'email' : sendViaOptions[0]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const catalog = useMemo(() => {
    const toOption = (row: Row, category: Line['category']) => ({
      value: `${category}:${str(row.id)}`,
      label: str(row.name),
      detail: `${category} · ${money(startingPrice(row))}`,
      row,
      category,
    });
    // Only offer line kinds the API's ItemCategory accepts.
    const serviceRows = itemCategories.includes('Service') ? rows(services.data) : [];
    const productRows = itemCategories.includes('Product') ? rows(products.data) : [];
    return [...serviceRows.map((row) => toOption(row, 'Service')), ...productRows.map((row) => toOption(row, 'Product'))].filter(
      (option) => Number.isFinite(Number(startingPrice(option.row)))
    );
  }, [services.data, products.data, itemCategories]);

  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const addItem = (value: string) => {
    const option = catalog.find((item) => item.value === value);
    if (!option) return;
    const id = str(option.row.id);
    setErrors((current) => ({ ...current, items: '' }));
    setLines((current) => {
      const existing = current.find((line) => line.id === id && line.category === option.category);
      if (existing) return current.map((line) => (line === existing ? { ...line, quantity: Math.min(10000, line.quantity + 1) } : line));
      return [...current, { key: value, id, category: option.category, name: option.label, price: Number(startingPrice(option.row)), quantity: 1 }];
    });
  };

  const send = async () => {
    const next: Record<string, string> = {};
    const cleanPhone = normalizePhone(phone);
    if (!name.trim()) next.name = "Enter the customer's name.";
    if (!isEmail(email)) next.email = 'Enter a valid email address.';
    if (!isE164(cleanPhone)) next.phone = 'Use international format, e.g. +18765550123.';
    if (!lines.length) next.items = 'Add at least one item.';
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError('Please fix the highlighted fields.');
      return;
    }
    setFormError(null);
    setSaving(true);
    const dueDate = addDays(Number(due));
    const total = Math.round(subtotal * 100) / 100;
    try {
      await request('/invoices', {
        method: 'POST',
        body: {
          customerName: name.trim(),
          customerEmail: email.trim().toLowerCase(),
          customerPhone: cleanPhone,
          dueDate,
          // Payment link stays valid for 30 days after the due date.
          expDate: addDays(Number(due) + 30),
          items: lines.map((line) => ({ id: line.id, category: line.category, name: line.name, quantity: line.quantity, price: line.price })),
          subtotal: total,
          total,
          sendVia,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });
      toast.success(`Invoice sent to ${name.trim()}`);
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['left', 'right']} footer={<Button icon="send" label={lines.length ? `Send ${money(subtotal)}` : 'Send invoice'} loading={saving} onPress={() => void send()} />}>
      <View style={styles.top} />
      {formError ? <Banner message={formError} /> : null}

      <Text style={styles.section}>Bill to</Text>
      <Field autoCapitalize="words" autoComplete="name" error={errors.name} label="Customer name" onChangeText={setName} value={name} />
      <Field autoCapitalize="none" autoComplete="email" error={errors.email} keyboardType="email-address" label="Email" maxLength={254} onChangeText={setEmail} value={email} />
      <Field autoComplete="tel" error={errors.phone} keyboardType="phone-pad" label="Phone" maxLength={20} onChangeText={setPhone} placeholder="+1 876 555 0123" value={phone} />

      <Text style={styles.section}>Items</Text>
      {lines.map((line) => (
        <View key={line.key} style={styles.line}>
          <View style={styles.flex}>
            <Text numberOfLines={1} style={styles.lineName}>{line.name}</Text>
            <Text style={Type.caption}>{money(line.price)} each</Text>
          </View>
          <Stepper
            label={line.name}
            max={10000}
            onChange={(quantity) => setLines((current) => current.map((item) => (item.key === line.key ? { ...item, quantity } : item)))}
            value={line.quantity}
          />
          <IconButton icon="trash" label={`Remove ${line.name}`} onPress={() => setLines((current) => current.filter((item) => item.key !== line.key))} />
        </View>
      ))}
      <Select
        emptyText="Add services or products to your catalog first."
        error={errors.items}
        label={lines.length ? 'Add another item' : 'Add an item'}
        loading={services.loading || products.loading}
        onChange={addItem}
        options={catalog.map(({ value, label, detail }) => ({ value, label, detail }))}
        placeholder="Choose from your catalog"
        value={null}
      />

      {lines.length ? (
        <View style={styles.total}>
          <Text style={Type.headline}>Total</Text>
          <Text style={styles.totalValue}>{money(subtotal)}</Text>
        </View>
      ) : null}

      <ChoiceChips label="Payment due" onChange={setDue} options={dueOptions} value={due} />
      <ChoiceChips<SendVia>
        label="Send by"
        onChange={setSendVia}
        options={sendViaOptions.map((value) => ({ value, label: sendViaLabels[value] ?? enumLabel(value) }))}
        value={sendVia}
      />
      <Field label="Note to customer" maxLength={2000} multiline onChangeText={setNotes} placeholder="Optional" value={notes} />
      <Text style={styles.disclaimer}>The customer receives a secure link to view and pay. Payment status updates here once it&apos;s confirmed.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { height: Spacing.lg },
  section: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md, marginTop: Spacing.sm },
  line: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border, marginBottom: Spacing.sm },
  lineName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl },
  totalValue: { fontSize: 22, fontWeight: '800', color: Colors.text },
  disclaimer: { fontSize: 12, color: Colors.textMuted, lineHeight: 17, marginBottom: Spacing.lg },
});
