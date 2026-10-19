# GigGuru Merchant

An Expo Router mobile workspace for independent merchants and service professionals. The app uses GigGuru's green-and-white brand, secure sign-in, and phone-first business management screens.

## Run locally

```sh
npm install
npx expo start
```

Set the API origin before signing in (HTTPS is required outside development).
The API prefix defaults to `/api/v1`; override it with `EXPO_PUBLIC_API_PATH_PREFIX`.

```sh
EXPO_PUBLIC_API_BASE_URL=https://your-api-host
```

Biometric app lock uses `expo-local-authentication`. Face ID can't be tested in
Expo Go on iOS — use a development build (`eas build --profile development`).

## App structure

- **Home** – today at a glance, the next booking, one-tap Start / Complete / No-show, and anything that needs attention (orders to process, overdue invoices).
- **Calendar** – month view with booking dots; tap a day, tap a booking.
- **Create (+)** – one sheet for every "new" flow: booking, invoice, service, product.
- **Sales** – orders and invoices with filters; one-tap order status steps, invoice reminders and cancellation.
- **Account** – catalog, business hours, locations, addresses, business profile, billing history, login & security.

Booking times, durations, categories and hours are all chosen by tapping — no typing dates or enum values. Enum values mirror the backend Prisma schema in `src/constants/enums.ts`.

## Security

- Tokens live in iOS Keychain / Android Keystore (`WHEN_UNLOCKED_THIS_DEVICE_ONLY`, never backed up); web sessions stay in memory only. Android `allowBackup` is off.
- Optional biometric app lock (relocks after 60s in the background) and a privacy cover in the app switcher.
- Proactive, single-flight token refresh; the app signs out automatically when the server rejects the refresh token. Sign-out revokes tokens server-side.
- 20s request timeouts, HTTPS-only base URL in production, path-injection guards, and server errors sanitized before display.
- Client-side sign-in throttling with exponential backoff on top of the API's rate limits; screens only refetch stale data (>30s) to stay inside the 100 requests / 15 min budget.
- Input validation (email, E.164 phone, password strength, https image links, money) before anything is sent.

## API boundaries

- Payment endpoints are read-only (shown as Billing history). Checkout, deposits, refunds, payment confirmation, customer-facing booking and public discovery need backend support before they can be represented as working features.

Read [AI_MOBILE_API_CONTEXT.md](./AI_MOBILE_API_CONTEXT.md) for endpoint contracts, token handling and API boundaries.

## Security requirements for integration

- Keep Stripe secret keys and privileged credentials on the backend.
- Store native authentication tokens in platform secure storage; never put them in ordinary app storage or source control.
- Use the ID token for merchant API calls and the access token only for sign-out and password changes, as specified by the API context.
- Treat the server as the source of truth and update the UI only after a successful response.
- Implement bounded error handling and respect API rate limits; do not retry authentication failures in a tight loop.
