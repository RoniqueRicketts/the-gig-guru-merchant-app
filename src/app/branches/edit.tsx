import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AddressFields, addressBody, addressFrom, validateAddress } from '@/components/address-fields';
import { FormScreen } from '@/components/form-screen';
import { Field, useToast } from '@/components/ui';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { get, str, type Row } from '@/lib/format';
import { isE164, normalizePhone, safeMessage } from '@/lib/security';

export default function BranchEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const branch = useQuery<Row>(id ? `/branches/${seg(id)}` : null);
  const title = id ? 'Edit location' : 'New location';

  if (id && branch.loading) return <FormScreen loading onSave={() => {}} saveLabel="" saving={false} title={title}>{null}</FormScreen>;
  if (id && !branch.data) {
    return (
      <FormScreen loadError={branch.error ?? 'Location not found.'} onRetry={() => void branch.refresh()} onSave={() => {}} saveLabel="" saving={false} title={title}>
        {null}
      </FormScreen>
    );
  }
  return <BranchForm id={id} initial={branch.data} title={title} />;
}

function BranchForm({ id, initial, title }: { id?: string; initial: Row | null; title: string }) {
  const toast = useToast();
  // Branch records may carry their address inline or nested under `address`.
  const source = (get(initial, 'address') as Row | undefined) ?? initial;
  const [name, setName] = useState(str(initial?.name));
  const [phone, setPhone] = useState(str(initial?.telephone));
  const [address, setAddress] = useState(() => addressFrom(source));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cleanPhone = normalizePhone(phone);
    const next = validateAddress(address);
    if (!name.trim()) next.name = 'Give this location a name.';
    if (cleanPhone && !isE164(cleanPhone)) next.phone = 'Use international format, e.g. +18765550123.';
    setErrors(next);
    if (Object.keys(next).length) return setFormError('Please fix the highlighted fields.');
    setFormError(null);
    setSaving(true);
    try {
      const body = { name: name.trim(), ...addressBody(address), ...(cleanPhone ? { telephone: cleanPhone } : {}) };
      await request(id ? `/branches/${seg(id)}` : '/branches', { method: id ? 'PATCH' : 'POST', body });
      toast.success(id ? 'Location updated' : 'Location added');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    try {
      await request(`/branches/${seg(id!)}`, { method: 'DELETE' });
      toast.success('Location deleted');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      deleteLabel={id ? 'Delete location' : undefined}
      error={formError}
      onDelete={id ? () => void remove() : undefined}
      onSave={() => void save()}
      saveLabel={id ? 'Save changes' : 'Add location'}
      saving={saving}
      title={title}>
      <Field error={errors.name} label="Location name" onChangeText={setName} placeholder="e.g. Downtown studio" value={name} />
      <Field autoComplete="tel" error={errors.phone} keyboardType="phone-pad" label="Phone" maxLength={20} onChangeText={setPhone} placeholder="Optional · +1 876 555 0123" value={phone} />
      <AddressFields errors={errors} onChange={setAddress} values={address} />
    </FormScreen>
  );
}
