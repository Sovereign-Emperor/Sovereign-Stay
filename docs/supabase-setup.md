# Supabase development and deployment setup

Supabase authentication, database repositories, provider/student workflow
screens, and Edge Functions are present. Supabase mode selects those live
adapters and never falls back to browser-local demo records. This setup guide
does not attest to any project's deployed migrations, RLS policies, storage
rules, or Edge Function state.

## Local database validation

You need Node.js/npm, the Supabase CLI, and Docker Desktop (or a compatible
Docker Engine). From the repository root:

```sh
npx supabase start
npx supabase db reset
npx supabase db lint --local
npx supabase test db --local
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
- `20261104000100_security_and_workflow_hardening.sql` — role/catalogue
  provisioning and safe unassigned-user backfill, student-role insert policies,
  authorized exact-address reads, server-only audit/payment RPCs, and room-offer
  retirement that preserves booking references.
- `20261105000100_security_validation_completion.sql` — public RLS filters out
  retired room offers while allowing their managing providers to retain access.
- `20261106000100_review_authorization_hardening.sql` — requires active student
  accounts to own the completed booking for a new review.

Do not edit applied migrations. Create a new migration for later changes and
review it locally before any remote push. This repository has no production
project reference; never run `db push` against production without explicit
approval, backup, reviewed diff, and tested RLS behavior.

Before deploying migration 004 to a database that may already contain payment
rows, check that no Paystack transaction ID is attached to multiple payments;
the new unique index intentionally fails rather than silently choosing a row:

```sql
select gateway_transaction_id, count(*)
from public.payments
where gateway_transaction_id is not null
group by gateway_transaction_id
having count(*) > 1;
```

For a future deployment, first set `PAYMENT_ENABLED=false` and deploy the
updated `paystack-initiate` function so new attempts fail closed. Then use a
coordinated maintenance window to apply migrations 004 and 005 in version
order and deploy the updated verification and webhook functions. Migration 004
revokes the older payment-failure RPC and replaces it with one that requires
verified amount and currency, so do not leave old handlers running after that
migration. Reconcile any payment events received during the window against
Paystack before re-enabling checkout. Only after the new functions and database
tests pass may sandbox payments be enabled by setting `PAYMENT_ENABLED=true`
in the sandbox project. Leave it false or unset elsewhere. Do not enable live
payments as part of this change.

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
Migrations 001–007 must be applied in order and the repositories validated
against that schema before the routes can work. Authentication requires email
provider configuration and email delivery in the Supabase dashboard.
Configure the allowed redirect URLs for `/auth/callback` and `/auth/reset`.

The linked project currently has email confirmation disabled as a temporary
measure. New accounts are therefore treated as email-confirmed without
proving mailbox ownership, and may sign in immediately. This is not a
recommended long-term production setting; re-enable confirmation after
custom SMTP is configured and tested.

The built-in Supabase email service is intended for development, currently
limits sending to 2 messages per hour, and may only deliver to project-team
addresses. Public signup and password recovery require a custom SMTP provider.
Configure its verified sender address and credentials in the Supabase
Authentication email/SMTP settings, and set up SPF, DKIM, and DMARC for the
sender domain. Keep SMTP credentials in Supabase settings, never in Vite
variables or the repository. An `email rate limit exceeded` response is not a
reason to disable email confirmation or repeatedly retry; wait for the limit
to recover and test with a mailbox you control after custom SMTP is configured.

Vite variables are embedded in the frontend. Never put a database password,
service-role key, Paystack secret, email-provider key, or other private
credential in a `VITE_` variable. The `.gitignore` excludes machine-specific
`.env` files.

## Edge Functions and Paystack sandbox

The following functions are wired to the booking interfaces, but are not
validated against a configured Supabase project or Paystack sandbox:

- `paystack-initiate` creates a payment attempt for a student-owned accepted
  booking and initializes Paystack using a server-derived GHS amount. It is
  disabled unless the server-only `PAYMENT_ENABLED` setting is exactly `true`.
- `paystack-verify` retrieves transaction status from Paystack and only marks
  a booking paid through the service-role database function after amount,
  currency, reference, and booking ownership checks. A verified failed or
  abandoned transaction is recorded as failed; recognized pending states stay
  pending, while an unknown status returns an error for investigation.
- `paystack-webhook` validates Paystack's HMAC signature, re-fetches the
  transaction from Paystack, matches its reference, amount, and currency to the
  payment and booking owner, then applies an idempotent database transition.
  Pending webhook states are retried, and unknown states are not acknowledged
  as final.
  The HMAC-SHA512 calculation and transaction comparisons have focused tests
  in `supabase/functions/_shared/paystack-validation.test.ts`.

The browser cannot write payment records or call payment-state RPCs. The
`service_role` can call the verification RPCs only; never expose its key.
Duplicate successful or failed webhook deliveries are idempotent, and a
gateway transaction ID cannot be applied to multiple payments.

Property area/location summaries remain public. Exact street addresses are
returned only to active provider-business members, administrators, or students
with an accepted, paid, or completed booking. Provider address reads use the
authorized RPC rather than direct column access. New enquiry, booking, and
report inserts require an active student role.

When editing a listing, room offers referenced by booking history are never
deleted. Their historical terms cannot be edited; omitted offers are marked
inactive, and providers must add a new offer to change the terms of a booked
room. Availability records and booking foreign keys are preserved.
Inactive offers are excluded by public RLS policies and the provider preview,
but remain visible to the managing provider for booking history.

Run the pgTAP workflow tests against a local Supabase database with
`npx supabase test db --local`. This command must not be changed to `--linked`
or a remote database URL for this project. The test transaction rolls back its
temporary users, properties, bookings, and payments.

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
npx supabase secrets set PAYMENT_ENABLED=false
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
- Supabase Auth email delivery, Paystack sandbox credentials/webhook, and
  production secrets are not configured.
- The Docker CLI is unavailable here and the local database port is not
  running, so the pgTAP suite and PostgreSQL migration lint could not execute.
- The additive hardening migrations and local pgTAP suite have not been applied
  or validated against a PostgreSQL server in this environment. A passing
  mocked frontend test or SQL source inspection is not an RLS integration test.
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
