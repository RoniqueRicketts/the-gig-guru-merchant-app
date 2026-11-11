/**
 * Display helpers for API enum values. The values themselves are never hardcoded in the app:
 * every option list comes from the API's GET /meta (see `src/lib/catalog.tsx`).
 */

/** Calendar swatches for the API's service colors; any color the API adds later falls back to brand green. */
const SERVICE_COLOR_HEX: Record<string, string> = {
  Red: '#E5484D',
  Blue: '#3B82F6',
  Green: '#257F24',
  Yellow: '#E5B000',
  Purple: '#8B5CF6',
  Orange: '#F97316',
  Pink: '#EC4899',
};

export function serviceColorHex(value: unknown): string {
  return (typeof value === 'string' && SERVICE_COLOR_HEX[value]) || '#257F24';
}

/** Country names are proper nouns: "United_States" → "United States", "St_Lucia" → "St. Lucia". */
export function countryLabel(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .split('_')
    .map((word) => (word === 'and' ? '&' : word === 'St' ? 'St.' : word))
    .join(' ');
}

/** Request field types. The allowed values are whatever the API's catalog lists at runtime. */
export type AppointmentNextStatus = string;
export type SettableOrderStatus = string;
export type SendVia = string;

/** Quick-pick lengths for a service. Duration is free text on the API, so these are only UI shortcuts. */
export const DurationPresets = [
  { label: '15 min', value: '15' },
  { label: '30 min', value: '30' },
  { label: '45 min', value: '45' },
  { label: '1 hr', value: '60' },
  { label: '1.5 hr', value: '90' },
  { label: '2 hr', value: '120' },
  { label: '3 hr', value: '180' },
];

/** "Fitness_And_Training" → "Fitness and training" */
export function enumLabel(value: string | null | undefined): string {
  if (!value) return '';
  const words = value.replace(/_/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}
