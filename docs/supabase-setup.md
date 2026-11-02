# Supabase development and deployment setup

Supabase authentication and database/Edge Function scaffolding are present.
The student/provider marketplace is still backed by browser-local demo
repositories, so selecting Supabase mode intentionally blocks those routes.
No project is linked and no migration or Edge Function has been deployed.

## Local database validation

You need Node.js/npm, the Supabase CLI, and Docker Desktop (or a compatible
Docker Engine). From the repository root:

```sh
npx supabase start
npx supabase db reset
npx supabase db lint --local
npm test
```

`db reset` recreates the local database and applies every migration and seed;
it deletes local development database contents. Use it only when that reset is
acceptable. The configured seed contains catalogues and roles, not users,
credentials, or real accommodation.

The schema history currently contains:

- `20261101000100_initial_marketplace_schema.sql` — identity, provider
  memberships, properties, listings, room offers, media metadata, RLS,
  moderation and verification functions.
- `20261102000100_marketplace_operations_and_payments.sql` — enquiries,
  bookings and status history, payments, reviews, reports, notifications,
  audit events, additional RLS, and a private `listing-media` bucket.

Do not edit applied migrations. Create a new migration for later changes and
review it locally before any remote push. This repository has no production
project reference; never run `db push` against production without explicit
approval, backup, reviewed diff, and tested RLS behavior.

## Frontend mode and public configuration

Copy `.env.example` to `.env.local`. For the browser-local demonstration
workspace, explicitly set:

```env
VITE_DATA_MODE=demo
```

To try the Supabase authentication and administrator scaffolding, configure
your own non-production project:

```env
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Use the Supabase publishable/anon key only. It is browser-visible; RLS and
database authorization are required. The Supabase-mode marketplace routes
remain blocked because property/listing/enquiry repositories are not wired to
the database. Authentication requires email provider configuration and email
delivery in the Supabase dashboard. Configure the allowed redirect URLs for
`/auth/callback` and `/auth/reset`.

Vite variables are embedded in the frontend. Never put a database password,
service-role key, Paystack secret, email-provider key, or other private
credential in a `VITE_` variable. The `.gitignore` excludes machine-specific
`.env` files.

## Edge Functions and Paystack sandbox

The following functions are scaffolding, not a fully connected booking
checkout:

- `paystack-initiate` creates a payment attempt for a student-owned accepted
  booking and initializes Paystack using a server-derived GHS amount.
- `paystack-verify` retrieves transaction status from Paystack and only marks
  a booking paid through the service-role database function after amount,
  currency, reference, and booking ownership checks.
- `paystack-webhook` validates Paystack's HMAC signature, re-fetches the
  transaction from Paystack, then applies the idempotent database transition.

There is a verification callback page, but the marketplace has no live booking
request or payment-initiation UI. The payment amount currently represents the
full accepted room-price snapshot; deposit and fee policy requires product
approval before enabling checkout.

Only when a separate sandbox Supabase project and Paystack test credentials
are available, configure Edge Function secrets through the Supabase CLI or
dashboard (never commit them):

```sh
npx supabase secrets set APP_ORIGIN=https://your-sandbox-app.example
npx supabase secrets set PAYSTACK_SECRET_KEY=YOUR_PAYSTACK_TEST_SECRET
npx supabase secrets set SUPABASE_ANON_KEY=YOUR_PROJECT_ANON_KEY
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_PROJECT_SERVICE_ROLE_KEY
npx supabase functions deploy paystack-initiate
npx supabase functions deploy paystack-verify
npx supabase functions deploy paystack-webhook
```

`APP_ORIGIN` must be the exact allowed browser origin without a trailing path.
Configure Paystack's sandbox webhook endpoint as
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook` and enable
charge-success and charge-failed events. The webhook function disables gateway
JWT verification in `supabase/config.toml` because it authenticates requests
with the Paystack signature; the other functions verify the signed Supabase
user session themselves. Use only Paystack test credentials. Live payments
require explicit owner approval, real credentials, full testing, and a
confirmed product decision.

## Authorization and administrator setup

New users receive only the student role from the auth trigger. Provider
onboarding calls a database function that assigns provider access after
checking the verified session. The account-type selection in the signup UI is
metadata for routing only; it does not grant authorization. No default
administrator exists, and the browser has no operation to assign itself an
admin role. A trusted database operator must provision the first administrator
through a separately secured process.

The `/admin` page is available only in explicitly configured Supabase mode.
It calls restricted moderation, verification, report, review, and account
status functions. Those operations are enforced by SQL authorization checks
and write audit records. Lists are capped at 100 records per category and are
not platform-wide metric totals. Database authorization and RLS still require
tests with anonymous, student, separate provider-business, and admin users
before real data is used.

The private media bucket restricts object operations by listing membership and
listing lifecycle. This is not a complete upload-security pipeline: image
processing, metadata creation, malware scanning, signed-URL lifecycle, and
browser upload UI are not implemented.

## Current validation and launch blockers

- No Supabase project is linked and no database migration has been applied.
- Docker is unavailable in the current development environment, so local
  PostgreSQL parsing, migration execution, and RLS tests cannot be claimed.
- Supabase Auth email delivery, Paystack sandbox credentials/webhook, and
  production secrets are not configured.
- The marketplace frontend still uses local demo repositories; bookings,
  booking history, provider booking queue, payment initiation, live enquiries,
  production image uploads, and user-management APIs are incomplete.
- No production hosting target/domain, monitoring, email service, backup plan,
  or deployment pipeline has been configured or verified.

For these reasons the project is **not production-ready**. Do not deploy the
new migration or enable payments in a live project until the blockers above
are resolved and the security and end-to-end workflows are verified.
