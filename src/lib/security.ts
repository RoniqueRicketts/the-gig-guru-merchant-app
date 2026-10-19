/**
 * Client-side validation and hardening helpers. The server stays authoritative; these exist to
 * give fast feedback, keep obviously malformed input off the wire, and avoid leaking internals.
 */

export const E164 = /^\+[1-9]\d{1,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= 254 && EMAIL.test(trimmed);
}

export function isE164(value: string): boolean {
  return E164.test(value.trim());
}

/** Strips spaces, dashes and brackets so "+1 (876) 555-0100" becomes "+18765550100". */
export function normalizePhone(value: string): string {
  return value.replace(/[\s().-]/g, '');
}

export type PasswordCheck = { label: string; met: boolean };

export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase', met: /[A-Z]/.test(password) },
    { label: 'Lowercase', met: /[a-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
    { label: 'Symbol', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function isStrongPassword(password: string): boolean {
  return passwordChecks(password).every((check) => check.met);
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/** Positive money amount with at most 2 decimals, bounded by the API's 1,000,000 limit. */
export function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[,\s$]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const amount = Number(cleaned);
  return amount > 0 && amount <= 1_000_000 ? amount : null;
}

export function parseWholeNumber(value: string, max = 1_000_000): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const amount = Number(value.trim());
  return amount <= max ? amount : null;
}

/**
 * Turns a server or network error into a short, user-safe message.
 * Drops HTML/stack-trace-like payloads so internals never reach the screen.
 */
export function safeMessage(input: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw = input instanceof Error ? input.message : typeof input === 'string' ? input : '';
  const message = raw.trim();
  if (!message) return fallback;
  if (/<[a-z!/][\s\S]*>/i.test(message)) return fallback;
  if (/\bat\s+\S+\s+\(|Prisma|SQL|ECONN|stack/i.test(message)) return fallback;
  return message.length > 180 ? `${message.slice(0, 177)}…` : message;
}

/**
 * Exponential client-side lockout for repeated failed sign-ins. This complements the server's
 * rate limit (10 attempts / 15 min) and stops scripted guessing from a single device.
 */
export function createAttemptLimiter({ freeAttempts = 3, baseDelayMs = 5_000, maxDelayMs = 5 * 60_000 } = {}) {
  let failures = 0;
  let lockedUntil = 0;
  return {
    remainingLockMs: () => Math.max(0, lockedUntil - Date.now()),
    recordFailure() {
      failures += 1;
      if (failures > freeAttempts) {
        const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (failures - freeAttempts - 1));
        lockedUntil = Date.now() + delay;
      }
    },
    reset() {
      failures = 0;
      lockedUntil = 0;
    },
  };
}

/** Random ID for client-generated records (e.g. invoice line items). */
export function randomId(): string {
  const bytes = new Uint8Array(12);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
