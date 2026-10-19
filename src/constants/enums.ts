/**
 * Enum values mirrored from the backend Prisma schema (the-gig-guru-dashboard/prisma/prod/schema.prisma).
 * The API validates these strictly — keep them in sync with the backend.
 */

export const ServiceCategories = [
  'Appliance_Repair', 'Barber', 'Cleaning', 'Consultation', 'Electrical', 'Event_Planning',
  'Financial_Services', 'Fitness_And_Training', 'Hairdresser', 'HealthCare', 'Home_Cleaning',
  'Home_Improvement', 'Installation', 'Landscaping', 'Legal_Services', 'Maintenance',
  'Marketing_And_Advertising', 'Mechanic', 'Personal_Care', 'Pest_Control', 'Plumber',
  'Photography_And_Videography', 'Roofing_Services', 'Repair', 'Services', 'Technology_Support',
  'Transportation', 'Tutoring', 'Wellness', 'Writing_And_Editing',
] as const;

export const ServiceColors = ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink'] as const;
export type ServiceColor = (typeof ServiceColors)[number];

export const ServiceColorHex: Record<ServiceColor, string> = {
  Red: '#E5484D',
  Blue: '#3B82F6',
  Green: '#257F24',
  Yellow: '#E5B000',
  Purple: '#8B5CF6',
  Orange: '#F97316',
  Pink: '#EC4899',
};

export const ProductCategories = [
  'Groceries', 'Fast_Food', 'Automotive', 'Clothing_Accessories', 'Electronics', 'Furniture',
  'Health_And_Beauty', 'Home', 'Jewelry', 'Office_Supplies', 'Pets', 'Party_Occasions',
  'Patio_And_Garden', 'Sports_Outdoors', 'Toys_And_Games', 'Manufacturer',
] as const;

export const Countries = [
  'Antigua_and_Barbuda', 'Bahamas', 'Canada', 'Jamaica', 'St_Lucia', 'Trinidad_and_Tobago', 'United_States',
] as const;

export const AddressLocations = ['Home', 'Work', 'School'] as const;

/** Statuses the merchant may move an appointment to (PATCH /appointments/{id}/status). */
export type AppointmentNextStatus = 'In_Progress' | 'Completed' | 'No_Show' | 'Canceled' | 'Rescheduled';

/** Statuses the merchant may set on an order (PATCH /orders/{id}/status). */
export const SettableOrderStatuses = ['Pending', 'Processing', 'Awaiting_Shipment'] as const;
export type SettableOrderStatus = (typeof SettableOrderStatuses)[number];

export const OrderStatuses = [
  'Awaiting_Payment', 'Pending', 'Processing', 'Awaiting_Shipment', 'Picked_Up', 'Shipped',
  'Completed', 'Canceled', 'Delivered', 'Returned',
] as const;

export const SendViaOptions = ['both', 'email', 'sms'] as const;
export type SendVia = (typeof SendViaOptions)[number];

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
