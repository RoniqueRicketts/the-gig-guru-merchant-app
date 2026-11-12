import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FormScreen } from '@/components/form-screen';
import { ChoiceChips, Field, Icon, Select, SwitchRow, useToast } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { rows, str, type Row } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { safeMessage } from '@/lib/security';

const GRACE_OPTIONS = [
  { value: '30', label: '30 sec' },
  { value: '60', label: '1 min' },
  { value: '120', label: '2 min' },
  { value: '180', label: '3 min' },
  { value: '300', label: '5 min' },
];

const SERVICE_OPTIONS = [
  { value: '300', label: '5 min' },
  { value: '600', label: '10 min' },
  { value: '900', label: '15 min' },
  { value: '1200', label: '20 min' },
  { value: '1800', label: '30 min' },
  { value: '2700', label: '45 min' },
  { value: '3600', label: '1 hr' },
];

/** Picks the stored value if it's one of the presets, else the closest preset. */
function nearest(options: { value: string }[], stored: unknown, fallback: string): string {
  const value = Number(stored);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return options.reduce((best, option) => (Math.abs(Number(option.value) - value) < Math.abs(Number(best) - value) ? option.value : best), options[0].value);
}

export default function QueueEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const queues = useQuery<Row[]>(id ? '/queues' : null);
  const branches = useQuery<Row[]>('/branches');
  const title = id ? 'Edit queue' : 'New queue';
  const initial = id ? rows(queues.data).find((row) => str(row.id) === id) ?? null : null;

  if ((id && queues.loading) || branches.loading) return <FormScreen loading onSave={() => {}} saveLabel="" saving={false} title={title}>{null}</FormScreen>;
  if (id && !initial) {
    return (
      <FormScreen loadError={queues.error ?? 'Queue not found.'} onRetry={() => void queues.refresh()} onSave={() => {}} saveLabel="" saving={false} title={title}>
        {null}
      </FormScreen>
    );
  }
  return <QueueForm branches={rows(branches.data)} id={id} initial={initial} title={title} />;
}

function QueueForm({ id, initial, branches, title }: { id?: string; initial: Row | null; branches: Row[]; title: string }) {
  const toast = useToast();
  const [name, setName] = useState(str(initial?.name));
  const [branchId, setBranchId] = useState<string | null>(str(initial?.branchId) || (branches.length === 1 ? str(branches[0].id) : null));
  const [counters, setCounters] = useState<string[]>(() => {
    const existing = Array.isArray(initial?.counters) ? initial.counters.map(str).filter(Boolean) : [];
    return existing.length ? existing : ['Counter 1'];
  });
  const [isOpen, setIsOpen] = useState(initial?.isOpen !== false);
  const [grace, setGrace] = useState(nearest(GRACE_OPTIONS, initial?.graceSeconds, '120'));
  const [service, setService] = useState(nearest(SERVICE_OPTIONS, initial?.defaultServiceSeconds, '600'));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'Give this queue a name.';
    if (!id && !branchId) next.branch = branches.length ? 'Choose a location.' : 'Add a location first (Account → Locations).';
    if (!counters.length) next.counters = 'Add at least one counter.';
    setErrors(next);
    if (Object.keys(next).length) return setFormError('Please fix the highlighted fields.');
    setFormError(null);
    setSaving(true);

    const shared = { name: name.trim(), counters, graceSeconds: Number(grace), defaultServiceSeconds: Number(service) };
    try {
      if (id) await request(`/queues/${seg(id)}`, { method: 'PATCH', body: { ...shared, isOpen } });
      else await request('/queues', { method: 'POST', body: { ...shared, branchId } });
      toast.success(id ? 'Queue updated' : 'Queue created');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen error={formError} onSave={() => void save()} saveLabel={id ? 'Save changes' : 'Create queue'} saving={saving} title={title}>
      <Field autoCapitalize="words" error={errors.name} label="Queue name" maxLength={80} onChangeText={setName} placeholder="e.g. Walk-in haircuts" value={name} />
      {!id ? (
        <Select
          emptyText="Add a location first (Account → Locations)."
          error={errors.branch}
          label="Location"
          onChange={setBranchId}
          options={branches.map((branch) => ({ value: str(branch.id), label: str(branch.name) || 'Location' }))}
          value={branchId}
        />
      ) : null}
      <CountersEditor error={errors.counters} onChange={setCounters} values={counters} />
      <ChoiceChips label="Time to reach the counter" onChange={setGrace} options={GRACE_OPTIONS} value={grace} />
      <ChoiceChips label="Typical time per customer" onChange={setService} options={SERVICE_OPTIONS} value={service} />
      <Text style={styles.hint}>Used for wait estimates until the queue learns from real service times.</Text>
      {id ? <SwitchRow detail="When closed, customers can't take a new ticket" label="Open for new tickets" onChange={setIsOpen} value={isOpen} /> : null}
    </FormScreen>
  );
}

/** Counter names as removable chips, plus an inline "add" field. */
function CountersEditor({ values, onChange, error }: { values: string[]; onChange: (values: string[]) => void; error?: string }) {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const add = () => {
    const label = draft.trim();
    if (!label) return;
    if (values.some((value) => value.toLowerCase() === label.toLowerCase())) return setLocalError('That counter already exists.');
    if (values.length >= 20) return setLocalError('Up to 20 counters.');
    haptic.select();
    setLocalError(null);
    onChange([...values, label]);
    setDraft('');
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Counters</Text>
      <View style={styles.chips}>
        {values.map((value) => (
          <Pressable
            accessibilityHint="Removes this counter"
            accessibilityLabel={`Counter ${value}`}
            accessibilityRole="button"
            key={value}
            onPress={() => {
              haptic.select();
              onChange(values.filter((item) => item !== value));
            }}
            style={styles.chip}>
            <Text style={styles.chipText}>{value}</Text>
            <Icon color={Colors.textMuted} name="close" size={12} />
          </Pressable>
        ))}
      </View>
      <View style={styles.addRow}>
        <TextInput
          accessibilityLabel="New counter name"
          maxLength={40}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder={`e.g. Chair ${values.length + 1}`}
          placeholderTextColor={Colors.textFaint}
          returnKeyType="done"
          style={styles.addInput}
          submitBehavior="submit"
          value={draft}
        />
        <Pressable accessibilityLabel="Add counter" accessibilityRole="button" disabled={!draft.trim()} onPress={add} style={[styles.addButton, !draft.trim() && styles.disabled]}>
          <Icon color={Colors.white} name="plus" size={18} />
        </Pressable>
      </View>
      {localError || error ? <Text style={styles.error}>{localError || error}</Text> : <Text style={styles.subHint}>Each counter (desk, chair, window) calls its own next customer.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: Spacing.lg },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 14, borderRadius: Radius.pill, backgroundColor: Colors.tint },
  chipText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  addRow: { flexDirection: 'row', gap: Spacing.sm },
  addInput: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  addButton: { width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.4 },
  hint: { fontSize: 13, color: Colors.textMuted, marginTop: -Spacing.sm, marginBottom: Spacing.lg },
  subHint: { fontSize: 13, color: Colors.textMuted, marginTop: Spacing.xs },
  error: { fontSize: 13, color: Colors.danger, marginTop: Spacing.xs },
});
