import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Banner, Button, DayPicker, Field, Screen, Select, TimeSlots, buildSlots, toOffsetIso, useToast } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request } from '@/lib/api';
import { dayKey, get, money, rows, startingPrice, str, type Row } from '@/lib/format';
import { isE164, isEmail, normalizePhone, safeMessage } from '@/lib/security';

function minutesOf(duration: unknown): number {
  const value = parseInt(str(duration), 10);
  return Number.isFinite(value) && value > 0 && value <= 24 * 60 ? value : 60;
}

/** Business hours for a given weekday from GET /schedules, if configured. */
function hoursFor(schedule: Row | null, day: string): { open: string; close: string } | null {
  const entries = rows(schedule?.schedule);
  if (!entries.length) return null;
  const [y, m, d] = day.split('-').map(Number);
  const weekday = String(new Date(y, m - 1, d).getDay());
  const entry = entries.find((item) => str(item.index) === weekday);
  if (!entry) return { open: '00:00', close: '00:00' }; // closed that day
  return { open: str(entry.start) || '09:00', close: str(entry.end) || '17:00' };
}

export default function NewAppointmentScreen() {
  const toast = useToast();
  const params = useLocalSearchParams<{ day?: string }>();
  const services = useQuery<Row[]>('/services?limit=100');
  const staff = useQuery<Row[]>('/users?limit=100');
  const branches = useQuery<Row[]>('/branches');
  const schedule = useQuery<Row | null>('/schedules');

  const initialDay = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) && params.day >= dayKey(new Date()) ? params.day : dayKey(new Date());
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const serviceRows = rows(services.data);
  const staffRows = rows(staff.data);
  const branchRows = rows(branches.data);

  // One fewer tap: if there's only one choice, it's already chosen.
  const effectiveStaff = staffId ?? (staffRows.length === 1 ? str(staffRows[0].id) : null);
  const effectiveBranch = branchId ?? (branchRows.length === 1 ? str(branchRows[0].id) : null);

  const service = serviceRows.find((row) => str(row.id) === serviceId);
  const duration = minutesOf(service?.duration);
  const hours = hoursFor(schedule.data, day);
  const slots = hours ? buildSlots(day, hours.open, hours.close, 30) : buildSlots(day);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!serviceId) next.service = 'Choose a service.';
    if (!effectiveStaff) next.staff = 'Choose who will do this booking.';
    if (!time) next.time = 'Pick a time.';
    if (!name.trim()) next.name = "Enter the customer's name.";
    if (!isEmail(email)) next.email = 'Enter a valid email so the customer gets confirmation.';
    const cleanPhone = normalizePhone(phone);
    if (cleanPhone && !isE164(cleanPhone)) next.phone = 'Use international format, e.g. +18765550123.';
    setErrors(next);
    if (Object.keys(next).length) {
      setFormError('Please fix the highlighted fields.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await request('/appointments', {
        method: 'POST',
        body: {
          fullname: name.trim(),
          email: email.trim().toLowerCase(),
          start: toOffsetIso(day, time!),
          end: toOffsetIso(day, time!, duration),
          serviceId,
          assignedToId: effectiveStaff,
          ...(effectiveBranch ? { branchId: effectiveBranch } : {}),
          ...(cleanPhone ? { telephone: cleanPhone } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        },
      });
      toast.success(`Booked ${name.trim()}`);
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      edges={['left', 'right']}
      footer={
        <Button
          label={service && time ? `Book · ${money(startingPrice(service))}` : 'Book'}
          loading={saving}
          onPress={() => void save()}
        />
      }>
      <View style={styles.top} />
      {formError ? <Banner message={formError} /> : null}
      {services.error ? <Banner message={services.error} /> : null}

      <Select
        emptyText="Add a service in Catalog first."
        error={errors.service}
        label="Service"
        loading={services.loading}
        onChange={(value) => {
          setServiceId(value);
          setErrors((current) => ({ ...current, service: '' }));
        }}
        options={serviceRows.map((row) => ({
          value: str(row.id),
          label: str(row.name),
          detail: [money(startingPrice(row)), `${minutesOf(row.duration)} min`].join(' · '),
        }))}
        placeholder="What are they booking?"
        value={serviceId}
      />

      <DayPicker
        onChange={(value) => {
          setDay(value);
          setTime(null);
        }}
        value={day}
      />
      <TimeSlots label={hours && hours.open === hours.close ? 'Time · closed this day' : `Time · ${duration} min`} onChange={setTime} slots={slots} value={time} />
      {errors.time ? <Text style={styles.error}>{errors.time}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Customer</Text>
        <Field autoCapitalize="words" autoComplete="name" error={errors.name} label="Name" onChangeText={setName} textContentType="name" value={name} />
        <Field
          autoCapitalize="none"
          autoComplete="email"
          error={errors.email}
          keyboardType="email-address"
          label="Email"
          maxLength={254}
          onChangeText={setEmail}
          value={email}
        />
        <Field
          autoComplete="tel"
          error={errors.phone}
          hint="Optional · include country code"
          keyboardType="phone-pad"
          label="Phone"
          maxLength={20}
          onChangeText={setPhone}
          placeholder="+1 876 555 0123"
          value={phone}
        />
      </View>

      {staffRows.length !== 1 ? (
        <Select
          emptyText="No team members found."
          error={errors.staff}
          label="With"
          loading={staff.loading}
          onChange={setStaffId}
          options={staffRows.map((row) => ({ value: str(row.id), label: str(row.fullname) || str(row.email), detail: str(get(row, 'branch', 'name')) || undefined }))}
          placeholder="Who's taking this booking?"
          value={effectiveStaff}
        />
      ) : null}
      {branchRows.length > 1 ? (
        <Select label="Location" onChange={setBranchId} options={branchRows.map((row) => ({ value: str(row.id), label: str(row.name), detail: str(row.city) || undefined }))} placeholder="Optional" value={effectiveBranch} />
      ) : null}
      <Field label="Notes" maxLength={2000} multiline onChangeText={setNotes} placeholder="Optional" value={notes} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { height: Spacing.lg },
  error: { color: Colors.danger, fontSize: 13, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  card: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: Spacing.lg, paddingBottom: 0, marginBottom: Spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
});
