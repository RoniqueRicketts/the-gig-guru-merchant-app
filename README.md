# GigGuru Merchant

An Expo Router mobile workspace for independent merchants and service professionals. The app uses GigGuru's green-and-white brand, secure sign-in, and phone-first business management screens.

## Run locally

```sh
npm install
npx expo start
```

Set the API origin before signing in. GigGuru's API prefix defaults to
`/api/v1`; it is automatically omitted for JSONPlaceholder. Set
`EXPO_PUBLIC_API_PATH_PREFIX` to an empty value when another server serves
routes from its root:

```sh
EXPO_PUBLIC_API_BASE_URL=https://your-api-host
```

For a safe connectivity check during development, you can use JSONPlaceholder:

```sh
EXPO_PUBLIC_API_BASE_URL=https://jsonplaceholder.typicode.com
```

The development sign-in screen's **Test API connection** action performs only
an unauthenticated `GET /posts/1`. The client blocks other methods, request
bodies, and authentication headers for JSONPlaceholder. This sample API does
not implement GigGuru sign-in or merchant routes. Keep credentials and tokens
out of source control. Native sign-in tokens use iOS Keychain / Android
Keystore-backed SecureStore; web sessions stay in memory only.

## Current scope

- The native splash screen shows the GigGuru mark; unauthenticated users see a welcome and sign-in screen.
- Authenticated users have Home, Manage, Activity and Profile tabs, with separate product, service, address, branch, appointment, schedule and company screens.
- Product, service, address and branch endpoints support create/read/update/delete. Appointments support create/read/edit/status/rescheduling, schedules support read/update, and company profiles support read/update. The screens intentionally do not offer unsupported delete or create operations.
- Payment endpoints are read-only. Checkout, deposits, refunds, payment confirmation, customer-facing booking and public discovery need backend support before they can be represented as working features.

Read [AI_MOBILE_API_CONTEXT.md](./AI_MOBILE_API_CONTEXT.md) for endpoint contracts, token handling and API boundaries.

## Security requirements for integration

- Keep Stripe secret keys and privileged credentials on the backend.
- Store native authentication tokens in platform secure storage; never put them in ordinary app storage or source control.
- Use the ID token for merchant API calls and the access token only for sign-out and password changes, as specified by the API context.
- Treat the server as the source of truth and update the UI only after a successful response.
- Implement bounded error handling and respect API rate limits; do not retry authentication failures in a tight loop.
