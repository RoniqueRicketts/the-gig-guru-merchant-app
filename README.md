# GigGuru Merchant

An Expo Router mobile workspace for independent merchants and service professionals. The mobile-first interface follows the supplied navy-and-pastel design reference and uses the GigGuru logo assets throughout.

## Run locally

```sh
npm install
npx expo start
```

Use the Expo Go app for the current UI preview, or open an iOS, Android, or web target from the Expo CLI.

## Current scope

- The Home screen is an account-free dashboard preview. It does not display invented appointments, orders, balances, or payment activity.
- The Business screen distinguishes API-supported merchant areas from future integrations.
- The app uses the supplied GigGuru marks for in-app branding, app icons, the web favicon, and the splash screen.
- Sign-in, secure session storage, and authenticated API access are not implemented yet. No credentials or tokens are stored by this preview.
- The existing API supports read-only payment records, not payment collection or confirmation. Stripe checkout, live map tracking, and socket-based updates need backend support before they can be represented as working features.

Read [AI_MOBILE_API_CONTEXT.md](./AI_MOBILE_API_CONTEXT.md) before implementing API calls. It documents endpoint contracts, authentication token handling, and missing backend capabilities.

## Security requirements for integration

- Keep Stripe secret keys and privileged credentials on the backend.
- Store authentication tokens in platform secure storage; never put them in ordinary app storage or source control.
- Use the ID token for merchant API calls and the access token only for sign-out and password changes, as specified by the API context.
- Treat the server as the source of truth and update the UI only after a successful response.
- Implement bounded error handling and respect API rate limits; do not retry authentication failures in a tight loop.
