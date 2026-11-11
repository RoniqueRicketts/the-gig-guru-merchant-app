import { Field, Select } from '@/components/ui';
import { countryLabel } from '@/constants/enums';
import { useCatalog } from '@/lib/catalog';

export type AddressValues = { line1: string; line2: string; city: string; state: string; zipcode: string; country: string | null };

export function addressFrom(row: Record<string, unknown> | null | undefined): AddressValues {
  const read = (key: string) => (typeof row?.[key] === 'string' ? (row[key] as string) : '');
  return { line1: read('line1'), line2: read('line2'), city: read('city'), state: read('state'), zipcode: read('zipcode'), country: read('country') || null };
}

export function validateAddress(values: AddressValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.line1.trim()) errors.line1 = 'Enter the street address.';
  if (!values.city.trim()) errors.city = 'Enter the city.';
  if (!values.state.trim()) errors.state = 'Enter the parish, state or region.';
  if (!values.country) errors.country = 'Choose a country.';
  return errors;
}

export function addressBody(values: AddressValues) {
  return {
    line1: values.line1.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    country: values.country,
    ...(values.line2.trim() ? { line2: values.line2.trim() } : {}),
    ...(values.zipcode.trim() ? { zipcode: values.zipcode.trim() } : {}),
  };
}

export function AddressFields({
  values,
  onChange,
  errors,
}: {
  values: AddressValues;
  onChange: (values: AddressValues) => void;
  errors: Record<string, string>;
}) {
  const { countries } = useCatalog();
  const set = (key: keyof AddressValues) => (value: string) => onChange({ ...values, [key]: value });
  return (
    <>
      <Field autoComplete="street-address" error={errors.line1} label="Street address" onChangeText={set('line1')} textContentType="streetAddressLine1" value={values.line1} />
      <Field label="Apt, suite, unit" onChangeText={set('line2')} placeholder="Optional" textContentType="streetAddressLine2" value={values.line2} />
      <Field error={errors.city} label="City / town" onChangeText={set('city')} textContentType="addressCity" value={values.city} />
      <Field error={errors.state} label="Parish / state" onChangeText={set('state')} textContentType="addressState" value={values.state} />
      <Field autoCapitalize="characters" label="Postal code" maxLength={12} onChangeText={set('zipcode')} placeholder="Optional" textContentType="postalCode" value={values.zipcode} />
      <Select error={errors.country} label="Country" onChange={set('country')} options={countries.map((value) => ({ value, label: countryLabel(value) }))} value={values.country} />
    </>
  );
}
