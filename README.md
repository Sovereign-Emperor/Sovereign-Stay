# Sovereign Stay

A mobile-first student accommodation discovery MVP for students around Koforidua Technical University (KTU). It is built with React, Vite, React Router, Tailwind CSS v4, and Lucide icons.

> **Demo data:** The properties, photos, prices, and example room counts in this frontend are illustrative only—not verified real-world listings or live availability. The frontend is not connected to a database or authentication service; there is no payment processing.

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
  data/               Related demo marketplace records and local repositories
  hooks/              React hooks for service-backed listing loading and paging
  pages/              Public pages and nested provider workspace routes
  services/           Listing and provider dashboard application logic
  test/                Shared Vitest and Testing Library setup
  utils/               Filtering, formatting, and listing-to-UI mapping
  App.jsx              App shell and client-side routes
  index.css            Tailwind import and responsive design system
  main.jsx             React entry point
docs/
  data-model.md       Milestone 004 data model and future architecture
  supabase-setup.md   Local Supabase setup, migrations, and security notes
supabase/
  config.toml         Local Supabase CLI configuration
  migrations/         Versioned PostgreSQL schema and RLS foundation
  seed.sql            Safe lookup catalogue values only
```

Tests live alongside the code they exercise in `*.test.js` and `*.test.jsx`
files. They cover discovery, provider property and listing workflows, room
offer validation, local enquiry submission, ownership checks, and regressions.
Read [docs/data-model.md](./docs/data-model.md) for entity relationships,
listing lifecycle, local demo storage, and the planned backend architecture.
Read [docs/supabase-setup.md](./docs/supabase-setup.md) for the local database
foundation, required tools, migration commands, and security warnings.

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

The initial Supabase SQL schema and lookup seed are staged under `supabase/`.
They are not connected to the frontend or a remote project. The current SQL
schema has not yet been migrated to cover all local demo fields, rental-period
values, or enquiries. Local database validation requires the Supabase CLI and
Docker; see the setup guide for commands and the current validation limitation.
Authentication, server-enforced ownership, public publishing, moderation,
server persistence, and real-time communication remain future work.
