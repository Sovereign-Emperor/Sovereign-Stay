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
  data/               Related demo marketplace records and local repository
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

Tests live alongside the code they exercise in `*.test.js` and `*.test.jsx` files.
The provider workspace is available at `/provider`. It uses a separate demo
provider repository and service, shows only that example provider's listings,
and includes working navigation to property, enquiry, and add-property
destinations. Property creation and enquiry management are explicit
placeholders; no provider changes are saved, and there is no authentication,
backend connection, or real provider data.
Read [docs/data-model.md](./docs/data-model.md) for entity relationships,
listing lifecycle, trust fields, media storage, pagination, and the proposed
provider/admin architecture.
Read [docs/supabase-setup.md](./docs/supabase-setup.md) for the local database
foundation, required tools, migration commands, and security warnings.

## What works in this MVP

- Search by property name or location.
- Filter by campus, neighbourhood, room arrangement, minimum and maximum semester price, and facilities; filters can be combined.
- Sort by recommendation, price, or distance to campus.
- Open individual property pages with photo galleries, amenities, availability, location, and house notes.
- Start an enquiry or viewing request in WhatsApp with a pre-filled property-specific message.
- Browse the About page and responsive mobile navigation.

Every property shown, including its photos, price, and example room count, is demonstration content only; listings are not real, live, or verified.

Tailwind CSS v4 is integrated through its Vite plugin in `vite.config.js`.
Listing pages now use `src/services/listingService.js` instead of importing
fixture arrays. The service calls the demo repository, which adapts the
normalized provider/listing/location/room/facility records in
`src/data/properties.js` to the current card and detail view model. This
preserves the working UI while establishing a replacement point for a future
API repository. The local adapter intentionally shows draft demo fixtures;
a production API must only return listings approved for discovery.

The provider workspace at `/provider` uses `src/data/demoProviderRepository.js`
and `src/services/providerDashboardService.js` to show a separate,
owner-scoped demo view. It is read-only: property creation and enquiry
management routes are clearly marked placeholders, and the dashboard has no
authentication, persistence, or backend permissions.

The model gives each listing an `ownerId` provider relationship, supports
multiple rooms and ordered photo/video media records, and separates listing
approval from provider verification, property verification, availability, and
the last-updated timestamp. The service accepts paginated search parameters;
the local adapter paginates its small fixtures, while a future server adapter
must perform filtering and pagination in the database for large result sets.
Authentication, provider property editing/creation, administration, uploads,
moderation, and persistent provider data are not implemented yet.

The initial Supabase SQL schema and lookup seed are staged under `supabase/`.
They are not connected to the frontend or a remote project. Local database
validation requires the Supabase CLI and Docker; see the setup guide for
commands and the current validation limitation.
