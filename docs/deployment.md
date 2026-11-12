# Sovereign Stay deployment guide

## Readiness boundary

This repository contains application code and ordered migrations, not proof of
a deployed or validated Supabase environment. Migrations 001–006 and their
RLS policies have not been runtime-validated in the current development
workflow. Do not deploy real student data or enable payments until the database
checks and the restricted-user smoke tests below have been completed in an
authorized, isolated non-production environment.

No hosting platform is selected by this guide. Configure SPA rewrites, TLS,
security headers, and environment values in the chosen hosting provider's
control plane; do not commit provider credentials or deployment tokens.

## Frontend environment

Set these build-time values in the hosting provider:

| Variable | Required | Notes |
|---|---|---|
| `VITE_DATA_MODE` | Yes | Set to `supabase` for a configured backend. Do not use `demo` for a real deployment. |
| `VITE_SUPABASE_URL` | Yes | HTTPS project URL. HTTP is accepted only for local development. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/publishable key only. Never put a service-role or secret key here. |
| `VITE_PAYMENTS_ENABLED` | No | Defaults off. Set to `true` only for an explicitly approved sandbox; this controls UI visibility and is not server authorization. |
| `VITE_WHATSAPP_NUMBER` | No | Public contact number in international digits-only format. |
| `VITE_CONTACT_EMAIL` | No | Public contact address. |

`.env.example` contains placeholders only. Do not copy Edge Function secrets
into `.env`, `.env.local`, any `VITE_` variable, or frontend source.

## Supabase database and migrations

Apply migrations in filename order, exactly once, in a controlled non-production
project first:

1. `20261101000100_initial_marketplace_schema.sql`
2. `20261102000100_marketplace_operations_and_payments.sql`
3. `20261103000100_connect_marketplace_workflows.sql`
4. `20261104000100_security_and_workflow_hardening.sql`
5. `20261105000100_security_validation_completion.sql`
6. `20261106000100_review_authorization_hardening.sql`

Do not edit applied migration history. Before migration 004, check for duplicate
non-null `payments.gateway_transaction_id` values using the preflight query in
[supabase-setup.md](./supabase-setup.md); resolve any conflict deliberately
before the unique index is applied.

Before any production change, require a reviewed migration plan, a verified
backup and recovery path, successful PostgreSQL lint and pgTAP tests, and an
explicit operator approval. Do not use a reset command against a database
containing data that must be retained. No remote migration command is part of
this guide.

## Storage and image processing

Migration 002 creates the private `listing-media` bucket with a 5 MiB limit
and JPEG/PNG/WebP declared MIME allowlist. Object policies scope reads and
writes by listing lifecycle and provider membership. The frontend performs
declared MIME and size checks, but those checks do **not** validate file
contents.

There is no trusted image decoder/re-encoder or file-signature processing
service in this repository. Upload metadata remains `pending`; public listing
queries and object reads require media to be marked `ready`. Clients cannot
mark uploads ready. Keep media private and pending until a trusted processor
is integrated and tested to enforce byte-size limits, inspect actual file
signatures, decode and re-encode approved formats, and fail closed on errors.
Do not add a public bucket or a client-side approval path as a workaround.

## Edge Functions and server-only configuration

Deploy `paystack-initiate`, `paystack-verify`, and `paystack-webhook` only to an
approved non-production Supabase project after migrations 001–006 pass review.
Keep the webhook's platform JWT verification disabled only because it checks
Paystack's HMAC signature itself; the other functions require a verified
Supabase user. Configure the exact browser origin in `APP_ORIGIN`.

Use the Supabase project secret manager for server-only values:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- `APP_ORIGIN`
- `PAYSTACK_SECRET_KEY` only when sandbox verification is approved
- `PAYMENT_ENABLED=false` by default
- `PAYMENT_AMOUNT_PERCENT` within the supported 1–100 range

Never print secrets in deployment logs or expose them through frontend builds.
The browser flag `VITE_PAYMENTS_ENABLED` and the server flag `PAYMENT_ENABLED`
are independent gates. Do not enable either for live payments as part of this
prototype release.

## Authentication and administrator provisioning

Configure Supabase Auth email delivery, email confirmation, password policy,
and exact allowed redirect URLs for `/auth/callback` and `/auth/reset`. Use
HTTPS-only production origins. Enable stronger authentication, such as MFA,
for trusted administrators where supported.

New users receive the student role; provider privileges are assigned through
the database onboarding workflow. There is no default admin and no browser
admin-assignment feature. A trusted project owner must verify the intended
operator's identity, record approval in the organization's change log, assign
the admin role using a tightly controlled database-owner process, verify the
result with the operator, and remove temporary elevated access. Never perform
admin provisioning from an untrusted client or signup metadata.

## Abuse protection

Supabase Auth's project-level rate limits should be configured for sign-in,
signup, and recovery. This repository does not implement a distributed,
database-backed quota for enquiries, booking attempts, uploads, or Edge
Function requests. Do not treat process-local or in-memory counters as
production controls. Before exposing these operations to untrusted traffic,
add and test a shared rate-limit mechanism (for example a database-backed
quota or managed edge/WAF control) with an explicit retry policy.

## Frontend hosting, routing, and security headers

Configure the static host to serve the built Vite assets over HTTPS and rewrite
application routes (including `/properties/*`, `/auth/*`, `/provider/*`,
`/student/*`, `/admin`, and `/payment/*`) to `index.html`, while preserving
real asset paths and returning 404 for missing assets.

Set response headers at the hosting/CDN layer, not with client-side JavaScript.
At minimum configure:

- `Strict-Transport-Security` after HTTPS and subdomains are confirmed.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`.
- `Permissions-Policy` disabling unused camera, microphone, and geolocation.
- A tested Content Security Policy restricted to `'self'`, the exact Supabase
  project origin, the image host used by the app, and the Google Fonts origins
  used in `index.html`. Keep `object-src 'none'`, `base-uri 'self'`, and
  `form-action 'self'`. If sandbox checkout is enabled, verify top-level
  navigation to `https://checkout.paystack.com` under the selected CSP.

Do not copy a broad wildcard policy without testing it against the deployed
application's network requests. No hosting provider or CSP has been configured
or verified by this repository.

## Verification and post-deployment smoke tests

Before launch, run the migration lint and pgTAP suite against an isolated
database, then verify using separate anonymous, active/suspended student,
separate provider-business, and admin accounts:

1. Anonymous discovery returns only published listings, active room offers,
   and approved ready media; exact street addresses are absent.
2. Students can access only their own bookings and eligible reviews; suspended
   students cannot submit enquiries, bookings, reports, or reviews.
3. Providers cannot read or change another business's properties, listings,
   rooms, enquiries, or bookings.
4. Admin RPCs reject non-admin callers and produce actor-attributed audit
   records.
5. Direct client payment writes and execution of service-only RPCs are denied.
6. Storage rejects unauthorized paths and unapproved media remains private.
7. With payment disabled, the UI does not offer checkout and the Edge Function
   rejects initiation. Sandbox transaction tests require separate approval.

Also run frontend tests, the production build, Edge Function type/syntax checks,
and `git diff --check`. Source inspections and mocked tests do not replace
database/RLS integration tests.

## Rollback and recovery

Take and verify a restorable backup before schema deployment. Additive
migrations may be difficult or unsafe to reverse after data is written; prefer
a new corrective migration over dropping columns, tables, or records. Keep
compatible Edge Function versions available for rollback, but do not roll back
to a function that can call revoked or weaker payment RPCs. Reconcile payment
events with Paystack before changing payment handlers. Document the incident,
operator, recovery point, and validation results.

## External tasks still required

- **Supabase operator:** apply migrations in order, verify grants/RLS in the
  database, configure Auth, assign the initial admin, and validate backup and
  restore.
- **Image-processing service:** validate bytes and re-encode images before
  marking metadata ready.
- **Abuse controls:** configure Auth limits and deploy shared quotas/WAF
  controls for public and authenticated workflows.
- **Hosting operator:** choose a platform, configure SPA rewrites, TLS,
  environment variables, CORS origin, CSP/security headers, monitoring, and
  rollback.
- **Payments operator:** use a sandbox project and test credentials only,
  verify webhook delivery, and leave live payments disabled pending separate
  approval and end-to-end testing.
