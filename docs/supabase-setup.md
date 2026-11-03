# Supabase development and deployment setup

Supabase authentication, database repositories, provider/student workflow
screens, and Edge Functions are present. Supabase mode selects those live
adapters and never falls back to browser-local demo records. No project is
linked and no migration, RLS policy, storage rule, or Edge Function has been
deployed or verified in this environment.

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
- `20261103000100_connect_marketplace_workflows.sql` — listing/room fields,
  normalized listing facilities, provider property/listing RPCs, authenticated
  enquiry and booking request RPCs, and pre-publication media metadata rules.

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

To use the Supabase marketplace and authentication integrations, configure
your own non-production project:

```env
VITE_DATA_MODE=supabase
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Use the Supabase publishable/anon key only. It is browser-visible; RLS and
database authorization are required. Supabase mode uses the Supabase listing,
provider, enquiry, and booking adapters and does not fall back to demo data.
The new migration must be applied and the repositories validated against it
before the routes can work. Authentication requires email provider
configuration and email delivery in the Supabase dashboard. Configure the
allowed redirect URLs for `/auth/callback` and `/auth/reset`.

Vite variables are embedded in the frontend. Never put a database password,
service-role key, Paystack secret, email-provider key, or other private
credential in a `VITE_` variable. The `.gitignore` excludes machine-specific
`.env` files.

## Edge Functions and Paystack sandbox

The following functions are wired to the booking interfaces, but are not
validated against a configured Supabase project or Paystack sandbox:

- `paystack-initiate` creates a payment attempt for a student-owned accepted
  booking and initializes Paystack using a server-derived GHS amount.
- `paystack-verify` retrieves transaction status from Paystack and only marks
  a booking paid through the service-role database function after amount,
  currency, reference, and booking ownership checks.
- `paystack-webhook` validates Paystack's HMAC signature, re-fetches the
  transaction from Paystack, then applies the idempotent database transition.

The student UI can request a room, view booking/payment status, and initialize
checkout after provider acceptance. The provider UI can review and decide
booking requests. The payment amount currently represents the full accepted
room-price snapshot by default. `PAYMENT_AMOUNT_PERCENT` is a server-side
integer from 1 to 100 and defaults to `100`; it can configure an initial
percentage without trusting a browser-supplied amount. This prototype setting
is not a final commercial policy.

Only when a separate sandbox Supabase project and Paystack test credentials
are available, configure Edge Function secrets through the Supabase CLI or
dashboard (never commit them):

```sh
npx supabase secrets set APP_ORIGIN=https://your-sandbox-app.example
npx supabase secrets set PAYSTACK_SECRET_KEY=YOUR_PAYSTACK_TEST_SECRET
npx supabase secrets set PAYMENT_AMOUNT_PERCENT=100
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
listing lifecycle. Providers can upload media metadata and image objects to a
private listing path. Uploads remain pending and are not shown to students
until a trusted image-processing workflow marks them ready. Malware scanning,
image processing, automated cleanup, and operational signed-URL management
remain unimplemented.

## Current validation and launch blockers

- No Supabase project is linked and no database migration has been applied.
- Docker is unavailable in the current development environment, so local
  PostgreSQL parsing, migration execution, and RLS tests cannot be claimed.
- Supabase Auth email delivery, Paystack sandbox credentials/webhook, and
  production secrets are not configured.
- The new 006.5 migration has not been applied or parsed by a live/local
  PostgreSQL server. Repository queries, provider RPC writes, enquiry RLS,
  booking concurrency, and Storage permissions remain unverified.
- Paystack sandbox credentials, webhook delivery, email provider, project
  secrets, and real student/provider accounts are unavailable, so no complete
  transaction or browser journey can be claimed.
- Listing uploads stay private and pending because image processing and
  approval operations are not configured.
- No production hosting target/domain, monitoring, email service, backup plan,
  or deployment pipeline has been configured or verified.

For these reasons the project is **not production-ready**. Do not deploy the
new migration or enable payments in a live project until the blockers above
are resolved and the security and end-to-end workflows are verified.
