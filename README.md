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
- **Account** – catalog, business hours, locations, addresses, business profile, team, queues, attendance, deliveries, sales receipts, billing history, login & security.

Operations screens (reached from Account, Home quick actions and the Create sheet):

- **Team** – staff list with search, add a team member (they get an emailed temporary password), edit details, location and roles; manage roles.
- **Queues** – live walk-in board: one-tap *Call next* per counter, Recall / Done / No-show with the grace countdown, walk-in tickets, open/close. Refreshes every 20s while on screen.
- **Attendance** – clock in/out card on Home; managers see each day's shifts and can end a forgotten shift. *Premium plan.*
- **Deliveries** – request a courier for paid orders that ship (also from the order screen), track and call the courier, cancel before pickup.
- **Sales receipts** – the receipts GigGuru issues automatically for paid storefront orders, shareable from the phone.
- **Sign up** – new merchants register, confirm the emailed code and land signed in.

Premium-only or permission-restricted features show a plain explanation instead of an error (HTTP 402 / 403).

Booking times, durations, categories and hours are all chosen by tapping — no typing dates or enum values.

## The API is the only data source

The app never touches a database. Every read and write goes through the GigGuru API (`src/lib/api.ts`): auth, orders, bookings, map pins, everything.

- **Option lists** (categories, countries, colors, statuses, which status changes are allowed) come from the API's public `GET /api/v1/meta` at launch and live in memory only (`src/lib/catalog.tsx`). The app ships with no copies; if the API can't be reached at launch it shows a retry screen.
- **Map details** are the API's coordinates: location pins (`branch.address.latitude/longitude`), order pickup points and tracking events, courier positions. "Open in Maps" hands those coordinates to the phone's maps app. "Pin my current location" reads the phone's GPS once (foreground only, with permission) and sends it to `PUT /branches/{id}/location`; the app then shows what the API saved.
- On-device storage holds only the API's sign-in tokens (Keychain / Keystore) and the app-lock preference.

The backend must include `GET /api/v1/meta` (added in the-gig-guru-dashboard `server/api/meta`) before this app version is released. GPS pinning uses `expo-location`, so it needs a development or EAS build rather than Expo Go.

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
