# Sovereign Stay

A mobile-first student accommodation discovery MVP for students around Koforidua Technical University (KTU). It is built with React, Vite, React Router, Tailwind CSS v4, and Lucide icons.

> **Demo data:** The properties, photos, prices, and example room counts in this frontend are illustrative only—not verified real-world listings or live availability. There is no backend, authentication, or payment processing.

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

Vitest runs the tests in a simulated browser environment (jsdom). React Testing Library checks behavior through the same buttons, labels, and dialogs a user interacts with. Tests cover combined property filters and price validation, invalid-range feedback, failed-image fallbacks, and gallery keyboard behavior such as Escape, focus trapping, focus restoration, and scroll locking.

## Project structure

```text
src/
  components/       Shared navigation, footer, property card/image, gallery, and enquiry link
  config.js         Environment-configurable contact details
  data/             Demonstration property listings and photo URL helper
  pages/            Discovery homepage, property detail, and About pages
  utils/            Shared price formatting, property filtering, and price validation
  test/             Shared Vitest and Testing Library setup
  App.jsx           App shell and client-side routes
  index.css         Tailwind import and responsive design system
  main.jsx          React entry point

Tests live alongside the code they exercise in `*.test.js` and `*.test.jsx` files.
```

## What works in this MVP

- Search by property name or location.
- Filter by campus, neighbourhood, room arrangement, minimum and maximum semester price, and facilities; filters can be combined.
- Sort by recommendation, price, or distance to campus.
- Open individual property pages with photo galleries, amenities, availability, location, and house notes.
- Start an enquiry or viewing request in WhatsApp with a pre-filled property-specific message.
- Browse the About page and responsive mobile navigation.

Every property shown, including its photos, price, and example room count, is demonstration content only; listings are not real, live, or verified.

Tailwind CSS v4 is integrated through its Vite plugin in `vite.config.js`. Listings live separately in `src/data/properties.js` and can be replaced when verified provider data is available.
