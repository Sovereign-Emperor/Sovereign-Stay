# Sovereign Stay

A mobile-first student accommodation discovery MVP for students around Koforidua Technical University (KTU). It is built with React, Vite, React Router, Tailwind CSS v4, and Lucide icons.

> **Prototype status:** All browser-local property data is illustrative and is not verified real-world accommodation or live availability. Supabase authentication and server-side payment verification scaffolding are included, but the marketplace repositories, booking screens, and payment initiation UI are not connected. Do not treat this repository as production-ready.

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

   For local sample listings, explicitly set `VITE_DATA_MODE=demo`. The Vite development server also uses the demo workspace when no Supabase project is configured. Do not use demo mode for a production deployment. `VITE_DATA_MODE=supabase` currently enables the authentication/admin scaffolding only; it deliberately blocks marketplace routes until live repositories are implemented.

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
supabase/
  config.toml         Local Supabase CLI configuration
  functions/          Sandbox Paystack server-side function scaffolding
  migrations/         Versioned PostgreSQL schema, RLS, and marketplace operations
  seed.sql            Safe lookup catalogue values only
```

Tests live alongside the code they exercise in `*.test.js` and `*.test.jsx`
files. They cover discovery, provider property and listing workflows, room
offer validation, local enquiry submission, ownership checks, and regressions.
Read [docs/data-model.md](./docs/data-model.md) for entity relationships,
listing lifecycle, local demo storage, and the planned backend architecture.
Read [docs/supabase-setup.md](./docs/supabase-setup.md) for local database
setup, Edge Function secrets, migration commands, and security warnings.

## What works in this MVP

- Search by property name or location.
- Filter by campus, neighbourhood, room arrangement, minimum and maximum semester price, and facilities; filters can be combined.
- Sort by recommendation, price, or distance to campus.
- Open individual property pages with photo galleries, amenities, availability, location, and house notes.
- Submit an enquiry from a published listing and, separately, open a demo-aware WhatsApp contact link.
- Browse the About page and responsive mobile navigation.
- At `/provider`, create and edit physical properties and linked listings, add room offers, save drafts, preview and publish listings in the local demo, and manage enquiries in the provider inbox.

Every property, listing, photo, price, room count, and availability value is demonstration content only. “Publishing” only changes visibility within the same browser's local demo workspace; it is not public publication, moderation, verification, or a claim of real availability.

Tailwind CSS v4 is integrated through its Vite plugin in `vite.config.js`.
Student-facing listing pages use `src/services/listingService.js`, which
adapts normalized demo fixtures and locally saved provider listings through
the shared listing view model. Only listings with `published` status appear in
student discovery. Providers can keep drafts private, preview them, publish
them within their local browser workspace, unpublish to draft, or archive
them. Each listing points to a physical property by `propertyId`; room offers
and enquiries are stored as separate related records.

The provider workspace composes repositories under `src/data/` with service
logic under `src/services/`. Property metadata, listing records, room offers,
and enquiries use browser `localStorage`; property image blobs are stored in
IndexedDB. Records use stable local IDs and explicit property, listing, and
provider relationships. This persistence is limited to the current browser
profile: it is not a user account, synchronized backup, server, or production
authorization boundary. Clearing browser data removes locally saved records.

New listings require a valid property owned by the current demo provider.
Publishing requires at least one valid room offer. Listing cards show starting
prices based on their room offers, while detail pages show the individual
options. Students can submit a local enquiry from published listing details;
providers can filter the inbox and update enquiry status. The WhatsApp action
remains a separate contact option and explicitly describes the listing as a
demo example.

The Supabase migrations now stage account/profile roles, properties, listings,
room offers, enquiries, bookings, payment records, reviews, reports,
notifications, audit events, RLS policies, and a private listing-media bucket.
The frontend includes Supabase email-auth scaffolding, an administrator console,
and server-side Paystack initiate/verify/webhook functions. These database and
Edge Function changes have not been applied or exercised against a local or
remote Supabase project. The current student/provider marketplace remains
browser-local; no live listing/property/enquiry repository or booking request
flow is wired yet. The payment callback verifies with the server, but there is
no UI to create bookings or initiate a payment. The admin screen is available
only in explicitly configured Supabase mode and every operation relies on
database authorization; its first 100 rows per record category are shown.

**Not production-ready:** no Supabase project is linked, migration/RLS tests
have not run, and no credentials, email delivery, Paystack sandbox webhook,
monitoring, hosting target, or domain have been configured. Do not use live
payments. The payment function charges the accepted room's full price snapshot
in GHS; deposit or fee rules need product approval before launch. See
[docs/supabase-setup.md](./docs/supabase-setup.md) for exact setup and blockers.
