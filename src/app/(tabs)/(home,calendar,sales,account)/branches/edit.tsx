import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert } from 'react-native';

import { AddressFields, addressBody, addressFrom, validateAddress } from '@/components/address-fields';
import { FormScreen } from '@/components/form-screen';
import { Field, ListGroup, ListRow, useToast } from '@/components/ui';
import { useQuery } from '@/hooks/use-api';
import { request, seg, unwrapData } from '@/lib/api';
import { get, str, type Row } from '@/lib/format';
import { coordsOf, openInMaps } from '@/lib/maps';
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
      {id ? <MapPin branch={initial} /> : null}
    </FormScreen>
  );
}

/**
 * The branch's map pin. What's shown is always the API's record (`address.latitude/longitude`);
 * "Pin my current location" reads the phone's GPS once and sends it to PUT /branches/{id}/location,
 * then displays the coordinates the API saved.
 */
function MapPin({ branch }: { branch: Row | null }) {
  const toast = useToast();
  const [saved, setSaved] = useState<Row | null>(branch);
  const [busy, setBusy] = useState(false);
  const pin = coordsOf(saved, 'address');
  const hasAddress = !!get(saved, 'address');
  const id = str(branch?.id);

  const pinHere = async () => {
    setBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        toast.error('Location access is off. Turn it on in Settings to pin this location.');
        return;
      }
      const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const confirmed = await new Promise<boolean>((resolve) =>
        Alert.alert(
          'Pin this location here?',
          `Customers will find ${str(branch?.name) || 'this location'} at your current position on the GigGuru map. Make sure you're at the location.`,
          [
            { text: 'Not now', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Pin here', onPress: () => resolve(true) },
          ],
          { cancelable: true, onDismiss: () => resolve(false) }
        )
      );
      if (!confirmed) return;
      const result = await request<unknown>(`/branches/${seg(id)}/location`, {
        method: 'PUT',
        body: { latitude: coords.latitude, longitude: coords.longitude },
      });
      const updated = unwrapData<Row | null>(result);
      if (updated && typeof updated === 'object') setSaved(updated);
      toast.success('Pinned on the GigGuru map');
    } catch (cause) {
      toast.error(safeMessage(cause, "Couldn't get your location. Try again outdoors or near a window."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ListGroup title="On the GigGuru map">
      {pin ? (
        <ListRow
          icon="location"
          onPress={() => void openInMaps(pin, str(saved?.name))}
          subtitle={`${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}`}
          title="Pinned"
          value="Open in Maps"
        />
      ) : (
        <ListRow chevron={false} icon="location" subtitle="Customers can't find this location on the nearby map yet." title="No map pin" />
      )}
      {hasAddress ? (
        <ListRow
          chevron={false}
          icon="location"
          onPress={busy ? undefined : () => void pinHere()}
          subtitle="Use your phone's GPS while you're at this location"
          title={busy ? 'Getting your location…' : pin ? 'Move pin to my current location' : 'Pin my current location'}
        />
      ) : (
        <ListRow chevron={false} icon="info" subtitle="Save an address first, then pin it on the map." title="Add an address to pin" />
      )}
    </ListGroup>
  );
}
