import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { AddressFields, addressBody, addressFrom, validateAddress } from '@/components/address-fields';
import { FormScreen } from '@/components/form-screen';
import { ChoiceChips, Field, SwitchRow, useToast } from '@/components/ui';
import { AddressLocations } from '@/constants/enums';
import { useQuery } from '@/hooks/use-api';
import { request, seg } from '@/lib/api';
import { str, type Row } from '@/lib/format';
import { isE164, isEmail, normalizePhone, safeMessage } from '@/lib/security';

export default function AddressEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const address = useQuery<Row>(id ? `/addresses/${seg(id)}` : null);
  const title = id ? 'Edit address' : 'New address';

  if (id && address.loading) return <FormScreen loading onSave={() => {}} saveLabel="" saving={false} title={title}>{null}</FormScreen>;
  if (id && !address.data) {
    return (
      <FormScreen loadError={address.error ?? 'Address not found.'} onRetry={() => void address.refresh()} onSave={() => {}} saveLabel="" saving={false} title={title}>
        {null}
      </FormScreen>
    );
  }
  return <AddressForm id={id} initial={address.data} title={title} />;
}

function AddressForm({ id, initial, title }: { id?: string; initial: Row | null; title: string }) {
  const toast = useToast();
  const [name, setName] = useState(str(initial?.name));
  const [email, setEmail] = useState(str(initial?.email));
  const [phone, setPhone] = useState(str(initial?.telephone));
  const [location, setLocation] = useState<string>(str(initial?.location) || 'Work');
  const [isDefault, setIsDefault] = useState(initial?.isDefault === true);
  const [address, setAddress] = useState(() => addressFrom(initial));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cleanPhone = normalizePhone(phone);
    const next = validateAddress(address);
    if (!name.trim()) next.name = 'Give this address a label.';
    if (email.trim() && !isEmail(email)) next.email = 'Enter a valid email address.';
    if (cleanPhone && !isE164(cleanPhone)) next.phone = 'Use international format, e.g. +18765550123.';
    setErrors(next);
    if (Object.keys(next).length) return setFormError('Please fix the highlighted fields.');
    setFormError(null);
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        ...addressBody(address),
        location,
        isDefault,
        ...(email.trim() ? { email: email.trim().toLowerCase() } : {}),
        ...(cleanPhone ? { telephone: cleanPhone } : {}),
      };
      await request(id ? `/addresses/${seg(id)}` : '/addresses', { method: id ? 'PATCH' : 'POST', body });
      toast.success(id ? 'Address updated' : 'Address added');
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
      await request(`/addresses/${seg(id!)}`, { method: 'DELETE' });
      toast.success('Address deleted');
      router.back();
    } catch (cause) {
      setFormError(safeMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      deleteLabel={id ? 'Delete address' : undefined}
      error={formError}
      onDelete={id ? () => void remove() : undefined}
      onSave={() => void save()}
      saveLabel={id ? 'Save changes' : 'Add address'}
      saving={saving}
      title={title}>
      <Field error={errors.name} label="Label" onChangeText={setName} placeholder="e.g. Main office" value={name} />
      <ChoiceChips label="Type" onChange={setLocation} options={AddressLocations.map((value) => ({ value, label: value }))} value={location} />
      <AddressFields errors={errors} onChange={setAddress} values={address} />
      <Field autoCapitalize="none" error={errors.email} keyboardType="email-address" label="Email" maxLength={254} onChangeText={setEmail} placeholder="Optional" value={email} />
      <Field autoComplete="tel" error={errors.phone} keyboardType="phone-pad" label="Phone" maxLength={20} onChangeText={setPhone} placeholder="Optional · +1 876 555 0123" value={phone} />
      <SwitchRow label="Default address" onChange={setIsDefault} value={isDefault} />
    </FormScreen>
  );
}
