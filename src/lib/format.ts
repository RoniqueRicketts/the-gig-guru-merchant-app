import { enumLabel } from '@/constants/enums';

export type Row = Record<string, unknown>;
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function str(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

/** Safely reads a nested property: get(row, 'customer', 'fullname'). */
export function get(row: unknown, ...path: string[]): unknown {
  let current: unknown = row;
  for (const key of path) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Row)[key];
  }
  return current;
}

export function rows(value: unknown): Row[] {
  return Array.isArray(value) ? (value.filter((item) => item && typeof item === 'object') as Row[]) : [];
}

export function money(value: unknown, currency?: unknown): string {
  const amount = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(amount)) return '—';
  const code = typeof currency === 'string' && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'USD';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

export function toDate(value: unknown): Date | null {
  if (typeof value !== 'string' && !(value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** ISO 8601 with the device's UTC offset, e.g. 2026-10-18T09:30:00-05:00 (the API rejects bare UTC-less times). */
export function isoWithOffset(value: Date): string {
  const offset = -value.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  return (
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}` +
    `T${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}${sign}${pad(offset / 60)}:${pad(offset % 60)}`
  );
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

export function timeLabel(value: unknown): string {
  const date = toDate(value);
  return date ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—';
}

export function dateLabel(value: unknown, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString(undefined, options) : '—';
}

export function relativeDay(value: unknown): string {
  const date = toDate(value);
  if (!date) return '—';
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, tomorrow)) return 'Tomorrow';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function statusLabel(status: unknown): string {
  return enumLabel(str(status)) || 'Unknown';
}

export function statusTone(status: unknown): Tone {
  const value = str(status).toLowerCase();
  if (/(paid|complete|deliver|succeed|shipped|picked)/.test(value) && !value.includes('partial')) return 'success';
  if (/(cancel|no_show|overdue|fail|return|refund)/.test(value)) return 'danger';
  if (/(progress|processing|sent|scheduled)/.test(value)) return 'info';
  if (/(pending|awaiting|reschedul|partial|draft)/.test(value)) return 'warning';
  return 'neutral';
}

// ---- Domain accessors (keep API field knowledge in one place) ----

export const appointment = {
  customer: (row: Row) => str(get(row, 'customer', 'fullname')) || str(row.fullname) || str(row.title) || 'Customer',
  phone: (row: Row) => str(get(row, 'customer', 'telephone')),
  service: (row: Row) => str(get(row, 'service', 'name')) || str(row.title) || 'Appointment',
  serviceId: (row: Row) => str(get(row, 'service', 'id')) || str(row.serviceId),
  staff: (row: Row) => str(get(row, 'assignedTo', 'fullname')),
  branch: (row: Row) => str(get(row, 'branch', 'name')),
  price: (row: Row) => {
    const branchServices = rows(get(row, 'service', 'branchServices'));
    return branchServices[0]?.salePrice;
  },
};

export const invoice = {
  number: (row: Row) => str(row.invoiceId) || 'Invoice',
  customer: (row: Row) => str(get(row, 'customer', 'fullname')) || str(row.customerName) || 'Customer',
};

export const order = {
  number: (row: Row) => str(row.merchantOrderNumber) || str(row.id),
  shopper: (row: Row) => str(get(row, 'order', 'shopper', 'fullname')) || 'Customer',
  itemCount: (row: Row) => rows(row.orderItems).length,
};

/** Lowest branch sale price for a service or product, for list display. */
export function startingPrice(row: Row): unknown {
  const branchRows = [...rows(row.branchServices), ...rows(row.branchProducts)];
  const prices = branchRows.map((entry) => Number(entry.salePrice)).filter((price) => Number.isFinite(price));
  return prices.length ? Math.min(...prices) : undefined;
}
