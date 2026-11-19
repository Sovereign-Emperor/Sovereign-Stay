# Sovereign Stay

A mobile-first student accommodation discovery MVP for students around Koforidua Technical University (KTU). It is built with React, Vite, React Router, Tailwind CSS v4, and Lucide icons.

> **Prototype status:** Demo listings are illustrative and are not verified real-world accommodation or live availability. Supabase-mode pages now use live repository and RPC adapters, but the migrations, row-level security, storage policies, email setup, and Paystack sandbox journey have not been validated against a configured Supabase project. Do not treat this repository as production-ready.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. Install dependencies:

   ```sh
   npm install
   ```

3. (Optional) Configure enquiry contact details by copying `.env.example` to `.env.local` and setting:

   ```env
   VITE_WHATSAPP_NUMBER=233201234567
   VITE_CONTACT_EMAIL=hello@example.com
   ```

   Use an international WhatsApp number with digits only. If the number is blank, enquiry links open WhatsApp with a pre-filled message so the student can choose a contact.

   For local sample listings, explicitly set `VITE_DATA_MODE=demo`. Supabase mode requires `VITE_DATA_MODE=supabase`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`. In Supabase mode, missing backend data or permissions are reported as errors; the application does not silently show local demo records. Do not use demo mode for a production deployment. The current Supabase routes are an integration prototype and remain blocked by missing configuration or database setup.

   Vite embeds variables prefixed with `VITE_` in browser code. Use them only for contact details intentionally made public; never put passwords, API secrets, or private credentials in these variables.

4. Start the development server:

   ```sh
   npm run dev
   ```

5. Create and preview a production build:

   ```sh
   npm run build
   npm run preview
   ```

## Run tests

Run the complete test suite once:

```sh
npm test
```

Keep the test runner watching for changes while developing:

```sh
npm run test:watch
```

Vitest runs the tests in a simulated browser environment (jsdom). React Testing Library checks behavior through the same buttons, labels, and dialogs a user interacts with. Tests cover combined property filters, price validation, service pagination and provider ownership, homepage search, detail routes, failed-image fallbacks, and gallery keyboard behavior such as Escape, focus trapping, focus restoration, and scroll locking.

## Project structure

```text
src/
  components/       Shared navigation, listing UI, and reusable provider dashboard pieces
  config.js         Environment-configurable public contact details
  data/               Demo marketplace records, local repositories, and Supabase client
  hooks/              React hooks for service-backed listing loading and paging
  pages/              Public pages and nested provider workspace routes
  services/           Listing/provider logic, authentication, and admin actions
  test/                Shared Vitest and Testing Library setup
  utils/               Filtering, formatting, and listing-to-UI mapping
  App.jsx              App shell and client-side routes
  index.css            Tailwind import and responsive design system
  main.jsx             React entry point
docs/
  data-model.md       Local data model, Supabase schema, and boundaries
  supabase-setup.md   Local Supabase setup, migrations, and security notes
  deployment.md       Deployment prerequisites, security headers, and smoke tests
supabase/
  config.toml         Local Supabase CLI configuration
  functions/          Sandbox Paystack server-side function scaffolding
  migrations/         Versioned PostgreSQL schema, RLS, and marketplace operations
  seed.sql            Safe lookup catalogue values only
```

Tests live alongside the code they exercise in `*.test.js` and `*.test.jsx`
files. They cover discovery, provider property and listing workflows, room
offer validation, enquiry submission, booking service calls, ownership checks,
and regressions. Mocked repository tests do not replace database/RLS tests.
Read [docs/data-model.md](./docs/data-model.md) for entity relationships,
listing lifecycle, local demo storage, and the planned backend architecture.
Read [docs/supabase-setup.md](./docs/supabase-setup.md) for local database
setup, Edge Function secrets, migration commands, and security warnings.
Read [docs/deployment.md](./docs/deployment.md) for the deployment sequence,
server-only configuration, security headers, and remaining external tasks.

## What works in this MVP

- Search by property name or location.
- Filter by institution, neighbourhood, room arrangement, minimum and maximum price, availability, accommodation category, and facilities; filters can be combined.
- Sort by recommendation, price, or distance to campus.
- Open individual property pages with photo galleries, amenities, availability, location, and house notes.
- In demo mode, submit a local enquiry and use the clearly labelled example WhatsApp action.
- In configured Supabase mode, discover published listings, submit authenticated enquiries, request bookings for room offers, and view booking history.
- Browse the About page and responsive mobile navigation.
- At `/provider`, manage authorized Supabase properties and listings, add room offers, save drafts, preview or submit listings for moderator review, and manage enquiries and booking requests. Demo mode retains its separate browser-local workflow.

Demo properties, listings, photos, prices, room counts, and availability values are illustrative only. Demo publishing changes visibility only in that browser. Supabase listing submission enters the moderation workflow; only records whose database status is `published` appear in student discovery. Neither state represents verification or real-time availability.

Tailwind CSS v4 is integrated through its Vite plugin in `vite.config.js`.
Student-facing listing pages use `src/services/listingService.js` and select
either the explicitly configured Supabase repository or the separate demo
repository. Only published records appear in student discovery. The Supabase
provider editor saves listing and room-offer changes through database
functions, which enforce provider membership. New submissions require
moderator review; archived and draft records stay out of student search.

The provider workspace composes repositories under `src/data/` with service
logic under `src/services/`. Demo property metadata, listings, room offers,
and enquiries use browser `localStorage`; demo image blobs use IndexedDB.
Supabase mode uses database records for properties, listings, room offers,
enquiries, and bookings. Local and Supabase records are never merged. Actual
Supabase persistence and authorization cannot be claimed until migrations
have run and the project has been configured and tested.

In demo mode, new listings require a valid property owned by the current demo
provider, and publishing requires at least one valid room offer. Listing cards
show starting prices based on room offers, while detail pages show each option.
Local demo enquiries stay in browser storage. WhatsApp is separate and
explicitly describes demonstration listings as examples.

The migrations stage account/profile roles, properties, listings, normalized
room offers and facilities, enquiries, bookings, payment records, trust
records, RLS policies, and a private listing-media bucket. The frontend has
Supabase email-auth, provider, student booking, enquiry inbox, and payment
initiation interfaces. Listing photos upload to private storage and remain
hidden until the authenticated `listing-media-process` Edge Function validates
and re-encodes them. Editing a published listing returns it to draft and
requires administrator approval before it is shown again. The current booking
charge is the full accepted room-price snapshot in GHS by default. A
server-side `PAYMENT_AMOUNT_PERCENT` setting (1–100, default 100) controls the
initial charge percentage. The code paths and Edge Functions have not been
validated against a local or remote Supabase project, so this is not evidence
that backend, payment, or RLS behavior works in deployment.

The additive `20261104000100_security_and_workflow_hardening.sql` migration
seeds required catalogues, backfills only users without an existing role,
restricts exact property-address reads, aligns direct student inserts with
the student role, and preserves booked room records during listing edits.
Paystack webhook processing verifies the raw-body HMAC-SHA512 signature and
matches verified transaction details to a server-owned payment; clients cannot
change payment state. Exact addresses are exposed only through an authorization
RPC to provider members/admins or students with an accepted-or-later booking.
These changes still require local PostgreSQL/RLS tests and sandbox verification
before deployment; they do not establish remote database security.

The additive `20261105000100_security_validation_completion.sql` migration
keeps retired room offers available to their managing business for historical
context while hiding them from public listing queries. Paystack `abandoned`
transactions are treated as terminal failures; pending states remain pending,
and unrecognized webhook states are retried rather than acknowledged as final.
Payment initiation is fail-closed unless the server-only
`PAYMENT_ENABLED=true` setting is explicitly configured.

The additive `20261106000100_review_authorization_hardening.sql` migration
limits review submissions to active student accounts with a completed booking.
The additive `20261114000100_provider_listing_edit.sql` migration adds a
server-authorized, audit-logged workflow for returning published listings to
draft before provider edits.

The additive `20261119000100_public_discovery_search.sql` moves public listing
filtering, sorting and pagination into bounded Supabase RPCs, so discovery does
not download the entire marketplace catalogue or sign every listing image.

**Current media scope:** secure image upload is implemented. Video upload and
delivery are intentionally not enabled until a server-side transcoding,
malware-scanning, storage-cost and moderation workflow is deployed and tested.

**Not production-ready:** no Supabase project is linked, migrations and RLS
have not been run, and no email delivery, Paystack sandbox webhook, monitoring,
hosting target, or domain have been configured. Do not use live payments.
Consult [docs/supabase-setup.md](./docs/supabase-setup.md) for exact
configuration and validation steps. The payment function currently charges
the full accepted room price in GHS; deposit or fee policy still needs a
product decision; the server percentage can be adjusted with
`PAYMENT_AMOUNT_PERCENT`.
