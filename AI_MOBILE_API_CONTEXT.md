# GigGuru React Native Merchant App - API Context

Use this document as implementation context when building the GigGuru React Native merchant app. It describes the existing Express API routes and validation contracts; it is not a promise that unlisted capabilities exist.

## Product and UX goals

The target users are micro-merchants and service professionals. Optimize the app for quick, confident work on a phone:

- Make the next action obvious: today's appointments, order/invoice status, and clear calls to action.
- Keep booking and service management simple, use plain language, and minimize typing.
- Show prices and payment state clearly; avoid implying that a payment or booking is confirmed until the API confirms it.
- Make schedules, branches, services, and staff easy to manage in short sessions.
- Design empty, loading, offline, validation, and failure states as first-class parts of each screen.
- Build toward streamlined booking, verified reviews, automated deposits, digital payments, broader brand exposure, and reliable service delivery. Only implement a capability against the API when an endpoint below supports it. Do not simulate reviews, deposits, public discovery, or payment collection.

Additionally my theme colors are #013000, #257f24, #001900 and #02c800. White is also used for contrast.

## Important API boundaries

The current API is primarily a **merchant management API**. There are no routes in the current `/api/v1` router for customer-facing public service discovery, public booking/availability lookup, customer ratings/reviews, appointment deposit configuration/collection, creating a checkout/payment, or confirming payment. The payment routes are read-only. Do not invent routes or claim these features work; flag them as backend requirements if the app needs them.

The appointment-create route exists, but is authenticated and requires an assigned staff ID and a service ID. It is not a public customer booking flow or an availability-check endpoint.

## Base URL, auth, and transport

- API prefix: `{API_BASE_URL}/api/v1`
- JSON request and response bodies. The server parses JSON bodies up to 32 KB.
- Except for `/auth/**`, every route requires `Authorization: Bearer <Cognito ID token>`.
- Successful sign-in returns `{ success, message, data }`. `data.id` is the ID token for authenticated API requests; `data.access` is the Cognito access token; `data.refresh` is the refresh token; `data.expires` is the expiry in seconds; `data.user` contains decoded user claims. Store tokens using platform secure storage, not ordinary unencrypted app storage.
- Sign-in may instead return `success: false`, `message: "NEW_PASSWORD_REQUIRED"`, and `data` with `email` and `session`. Complete that flow through `/auth/complete-new-password-challenge`.
- `/auth/sign-out` and `/auth/change-password` pass the bearer token to Cognito as an access token. Use `data.access` for those two routes; use `data.id` for other authenticated API routes.
- `/auth/refresh` body is `{ userID, refreshToken }`; response is `{ expires, idToken, access, refresh }`. After refresh, use `idToken` for regular authenticated routes and `access` for sign-out/change-password.
- Public auth endpoints are not exempt from rate limits: sign-in allows 10 attempts per 15 minutes; recovery/confirmation operations allow 5 per 15 minutes. The API also has a shared per-IP limit of 100 requests per 15 minutes. Respect `429` and avoid tight retry loops.
- Authentication failures return `401`. Validation errors generally return `400` (`{ error }` or `{ message }`); other common error statuses are `402`, `403`, `404`, `409`, `429`, and `500`. Do not assume one uniform error-body key; display a safe fallback when `message`/`error` is absent.
- Most successful resource operations return `{ data: ... }`; auth operations generally return their documented auth object or `{ message }`. Collection endpoints may also return `pagination`.
- Zod-validated objects are generally strict: do not send unknown fields. Dates must follow the ISO format specified below; phone numbers that use the auth phone validator must be E.164 (for example `+1234567890`).
- Server-side API behavior is authoritative. Refreshing, updating, cancelling, or deleting should only update local UI after success; provide retry/error feedback when requests fail.

## Routes

All paths below are relative to `/api/v1`. `{id}` is a path parameter. Unless specifically noted, a route requires the ID-token bearer authorization described above.

### Authentication - no bearer token except where noted

| Method and path                              | Request                                                                      | Success                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `POST /auth/sign-in`                         | `{ email, password }`                                                        | `{ success, message, data }`; see token/challenge details above       |
| `POST /auth/sign-up`                         | `{ fullname, email, country, business_type, telephone, password }`           | `200 { message }`; confirmation is sent when registration can proceed |
| `POST /auth/confirm-sign-up`                 | `{ email, code }`                                                            | `200 { message }`                                                     |
| `POST /auth/resend-confirmation-code`        | `{ email }`                                                                  | `200 { message }`                                                     |
| `POST /auth/forget-password`                 | `{ email }`                                                                  | `200 { message }`                                                     |
| `POST /auth/confirm-forget-password`         | `{ email, code, password }`                                                  | `200 { message }`                                                     |
| `POST /auth/complete-new-password-challenge` | `{ email, session, password }`                                               | Auth result, same general shape as sign-in                            |
| `POST /auth/refresh`                         | `{ userID, refreshToken }`                                                   | `{ expires, idToken, access, refresh }`                               |
| `POST /auth/sign-out`                        | `Authorization: Bearer <access token>`; no body                              | `200 { message }`                                                     |
| `POST /auth/change-password`                 | `Authorization: Bearer <access token>`; `{ current_password, new_password }` | `200 { message }`                                                     |

Passwords require at least 8 characters, with uppercase, lowercase, number, and symbol. Sign-up phone number uses E.164. `country` and `business_type` are enum values from the backend Prisma schema; do not make up values.

### Merchant/company and setup

| Method and path                  | Request                                                               | Success                   |
| -------------------------------- | --------------------------------------------------------------------- | ------------------------- |
| `GET /companies`                 | None                                                                  | `{ data: companyOrNull }` |
| `GET /companies/{id}`            | None                                                                  | `{ data: companyOrNull }` |
| `PATCH /companies`               | Any non-empty subset of `{ email, theme, name, avatar, telephone }`   | `{ data: companyOrNull }` |
| `GET /addresses`                 | None                                                                  | `{ data: Address[] }`     |
| `POST /addresses`                | Address fields below                                                  | `201 { data }`            |
| `GET /addresses/{id}`            | None                                                                  | `{ data }`                |
| `PATCH` or `PUT /addresses/{id}` | Address update fields below                                           | `{ data }`                |
| `PATCH /addresses/{id}/default`  | None                                                                  | `{ data }`                |
| `DELETE /addresses/{id}`         | None                                                                  | `{ data }`                |
| `GET /branches`                  | None                                                                  | `{ data: Branch[] }`      |
| `POST /branches`                 | `{ name, line1, line2?, city, state, zipcode?, country, telephone? }` | `201 { data }`            |
| `GET /branches/{id}`             | None                                                                  | `{ data }`                |
| `PATCH /branches/{id}`           | Non-empty subset of branch fields above                               | `{ data }`                |
| `DELETE /branches/{id}`          | None                                                                  | `{ data }`                |

The company response is intentionally limited to `id`, `name`, `email`, `avatar`, `telephone`, `operationType`, `settings`, `isActive`, and `isVerified`. `GET /companies` is scoped to the authenticated user's organization. The `id` argument to `/companies/{id}` must match the backend ID format.

Address create fields: `name` (required), `email?`, `telephone?`, `line1` (required), `line2?`, `city` (required), `state` (required), `zipcode?`, `country` (required enum), `isDefault` (boolean, defaults false), `location` (required enum). Address update requires `name`, `line1`, `city`, `state`, `country`, `isDefault`, and `location`; `line2` and `zipcode` are optional. Branch create/update phone numbers use E.164. Branch creation creates a work-location address internally.

### Services, schedule, and appointments

| Method and path                       | Query/body                                                                         | Success                                                |
| ------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `GET /services`                       | Query: `q?`, `skip?` (default `0`, max `5000`), `limit?` (default `50`, max `100`) | `{ data, pagination: { limit, offset, hasMore } }`     |
| `POST /services`                      | Service-create fields below                                                        | `201 { data }`                                         |
| `GET /services/{id}`                  | None                                                                               | `{ data }`                                             |
| `PATCH` or `PUT /services/{id}`       | Service-update fields below                                                        | `{ data }`                                             |
| `DELETE /services/{id}`               | None                                                                               | `{ data }`                                             |
| `GET /schedules`                      | None                                                                               | `{ data: schedule }`                                   |
| `PUT /schedules`                      | Schedule object below                                                              | `{ data: schedule }`                                   |
| `GET /appointments`                   | Query below                                                                        | `{ data, pagination: { limit: 50, offset, hasMore } }` |
| `POST /appointments`                  | Appointment-create fields below                                                    | `201 { data }`                                         |
| `GET /appointments/{id}`              | None                                                                               | `{ data }`                                             |
| `PATCH /appointments/{id}`            | `{ notes?, serviceId }`                                                            | `{ data }`                                             |
| `PATCH /appointments/{id}/status`     | `{ nextStatus }`                                                                   | `{ data }`                                             |
| `PATCH /appointments/{id}/reschedule` | `{ start, end }`                                                                   | `{ data }`                                             |

Service create fields: `name` (string), `category` (backend enum), `description?`, `color` (backend enum), `duration` (string), `tasks` (array of `{ id, label, completed? }`), and `branch` (non-empty array of `{ id, duration?, previousPrice?, salePrice }`). Sale price must be positive. Update uses the same general service details, but each branch entry uses `branchId` instead of `id`. Backend enum values are defined by `ServiceCategory` and `ServiceColors`; use those exact values.

Schedule body: `{ schedule_duration, breaks, booking_limit, schedule }`. The first three values are digit strings. `schedule` contains 1-42 entries shaped `{ index, title, start, end }`; `index` is `"0"` through `"6"`, and times are 24-hour `HH:mm`. Only one entry per day is accepted and `end` must be later than `start`. No per-customer availability/slot-search route exists.

Appointment list query: `q?`, `status?` (backend `ServiceStatus` enum), `timeframe?` (`upcoming | past | all`), `branch?`, `skip?` (default `0`, max `5000`), `start?`, `end?` (ISO datetime including timezone offset). Page size is 50; `hasMore` is `data.length === 50`.

Appointment create body: `{ fullname, email, start, end, notes?, serviceId, assignedToId, branchId?, telephone? }`. `start`/`end` must be ISO datetimes with a timezone offset; start must be in the future and before end. `telephone`, if supplied, must be E.164. Status update body is `{ nextStatus }`, with values limited to `Completed`, `Canceled`, `In_Progress`, `No_Show`, or `Rescheduled` as represented by the backend `ServiceStatus` enum.

### Products and orders

| Method and path                 | Query/body                                                                         | Success                                                |
| ------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `GET /products`                 | Query: `q?`, `skip?` (default `0`, max `5000`), `limit?` (default `50`, max `100`) | `{ data, pagination: { limit, offset, hasMore } }`     |
| `POST /products`                | Product-create fields below                                                        | `201 { data }`                                         |
| `GET /products/{id}`            | None                                                                               | `{ data }`                                             |
| `PATCH` or `PUT /products/{id}` | Product-update fields below                                                        | `{ data }`                                             |
| `DELETE /products/{id}`         | None                                                                               | `{ data }`                                             |
| `GET /orders`                   | Query: `skip?` (default `0`, max `5000`), `status?` (backend `OrderStatus` enum)   | `{ data, pagination: { limit: 20, offset, hasMore } }` |
| `GET /orders/{id}`              | None                                                                               | `{ data }`                                             |
| `PATCH /orders/{id}/status`     | `{ status }`                                                                       | `{ data }`                                             |
| `POST /orders/{id}/cancel`      | No body                                                                            | `{ data }`                                             |

Product create fields: `name`, `category` (backend enum), and `images` are required. Optional fields: `brand`, `sku`, `description`, `height`, `width`, `length`, `weight`, `size[]`, `colors[]`, `isAvailable` (default true), `shippable` (default true), `branches[]`, and `variants[]`. Each create branch entry requires `{ branchId, reserved, quantity, salePrice, colors, isActive? }`; `previousPrice?` and `stock?` are optional. Each variant has `{ size, color, sku, branches }`; variant branches have `{ branchId, amount, currency?, stock?, isAvailable? }`. Product update requires `name`, `category`, `images`, and `branches`; update branch entries require `branchId`, `salePrice`, and `colors`. Numeric sale prices/amounts must be positive. Do not send unrecognized fields.

Orders list returns fulfillment/merchant orders, not a public cart or checkout. `status` on the status route is limited by the backend to `Pending`, `Processing`, or `Awaiting_Shipment`. `skip` advances the list offset; the server returns 20 records per page.

### Invoices and payments

| Method and path              | Query/body                                | Success                                                                       |
| ---------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------- | -------- | ---------- |
| `GET /invoices`              | Query: `skip?` (default `0`, max `5000`)  | `{ data, pagination: { limit: 50, offset, hasMore } }`                        |
| `POST /invoices`             | Invoice-create body below                 | `201 { data: { id, invoiceId, status, subtotal, total, currency, dueDate } }` |
| `GET /invoices/{id}`         | None                                      | `{ data }`                                                                    |
| `POST /invoices/{id}/cancel` | No body                                   | `{ data }`                                                                    |
| `POST /invoices/{id}/resend` | `{ sendVia: "both"                        | "email"                                                                       | "sms" }` | `{ data }` |
| `GET /payments`              | Query: `page?` (string, 1-500 characters) | `{ data }`                                                                    |
| `GET /payments/{id}`         | None                                      | `{ data }`                                                                    |

Invoice create body: `{ customerName, customerEmail, customerPhone, expDate, dueDate, items, notes?, subtotal, total, sendVia }`. Dates are ISO calendar dates (`YYYY-MM-DD`). `items` must contain at least one `{ id, category, name, description?, quantity, price }`; `category` is the backend `ItemCategory` enum, quantity and price must be positive. `sendVia` is `both`, `email`, or `sms`.

Payments has **list and detail only**. There is no payment-intent, checkout, deposit, refund, or payment-confirmation route in this API surface. Invoice creation sends an invoice; it is not proof of payment.

### Employees and roles

| Method and path                     | Query/body                                                                                                            | Success                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `GET /users`                        | Query: `limit?` (default `25`, max `100`), `offset?` (default `0`, max `10000`), `state?` (backend `UserState`), `q?` | `{ data, pagination: { limit, offset, total, hasMore } }` |
| `POST /users`                       | `{ fullname, email, telephone, roleId, branchId? }`                                                                   | `201 { data }`                                            |
| `GET /users/search`                 | Query: `q` (2-80 chars), `limit?` (default `20`, max `50`)                                                            | `{ data }`                                                |
| `GET /users/{id}`                   | None                                                                                                                  | `{ data }`                                                |
| `PATCH` or `POST /users/{id}`       | Non-empty subset of `{ fullname, email, branchId? }`; branchId may be null                                            | `{ data }`                                                |
| `DELETE /users/{id}`                | None                                                                                                                  | `{ data }`                                                |
| `GET /roles`                        | None                                                                                                                  | `{ data }`                                                |
| `POST /roles`                       | `{ name, description? }`                                                                                              | `201 { data }`                                            |
| `GET /roles/{id}`                   | None                                                                                                                  | `{ data }`                                                |
| `PATCH /roles/{id}`                 | Non-empty subset of `{ name, description, isActive }`                                                                 | `{ data }`                                                |
| `DELETE /roles/{id}`                | None                                                                                                                  | `{ data }`                                                |
| `POST /roles/{id}/users/{userId}`   | No body                                                                                                               | `201 { data }`                                            |
| `DELETE /roles/{id}/users/{userId}` | No body                                                                                                               | `{ data }`                                                |

The users API manages company employees and searches public user records for authenticated use; it is not a public merchant/customer-search endpoint.

## React Native implementation guidance for the consuming AI

1. Build a typed API client around a configurable base URL. Attach the current ID token to every non-auth request; do not hardcode credentials, production URLs, or secrets.
2. Keep token handling behind a secure-storage/session abstraction. Handle expiry/refresh deliberately and prevent simultaneous failed requests from triggering a refresh storm.
3. Model each route from this document and the actual response; do not assume list values are fully typed or that every error uses the same JSON shape.
4. Use the existing pagination fields and `hasMore` behavior. Do not infer total counts where none are returned.
5. Follow server field names exactly (including `serviceId`, `assignedToId`, `branchId`, `nextStatus`, `current_password`, and `new_password`). Strict validation rejects extra fields.
6. Use mobile-friendly forms, confirmation for destructive operations, readable price/status summaries, accessible touch targets, and clear validation errors. Do not show a success state before the server confirms success.
7. If asked to build customer-facing booking, reviews, deposits, discovery, or checkout, explain which backend routes/data are missing and isolate that UI as unconnected/proposed rather than fabricating a working API call.
8. Treat backend enum values and response records as source-of-truth. When a value set is not enumerated here, derive it from the relevant existing Prisma enum/schema in the repository; never guess.

## Backend source map

- Route registration and `/api/v1` prefix: `server/app.ts`, `server/api/index.ts`
- Auth middleware: `server/middleware/requireAuth.ts`
- Request validation and endpoint details: `server/api/**/index.ts`
- Request schemas and enum/type definitions: `app/utils/api/types/*.type.ts`
- Auth response/token behavior: `app/utils/api/user/auth.ts`
