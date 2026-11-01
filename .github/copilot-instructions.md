# Project Sovereign — Sovereign Stay

These workspace-wide instructions apply to every development task in this repository. Treat `PROJECT_SOURCE.txt` as the authoritative product specification and `README.md` as the setup and architecture guide. Keep both useful and up to date when changes affect them.

## Product direction

- Preserve the full product vision in `PROJECT_SOURCE.txt`. Build incrementally for the current milestone: a student accommodation discovery MVP starting around Koforidua Technical University (KTU), Ghana.
- Prioritize useful discovery, clear information, trust, accessibility, mobile performance, and a good student experience. Do not expand scope just because a feature is part of the long-term vision.
- Treat all current property data, prices, photos, room counts, and other listing details as demonstrations unless real data is explicitly supplied and verified. Never invent or imply genuine availability, provider or property verification, ratings, or reviews.
- Do not add authentication, payment processing, or backend services unless the product milestone explicitly calls for them.

## Inspect and plan before changing code

- Read the relevant existing files and inspect the working-tree changes before editing. Preserve unrelated user changes and working application behavior.
- For substantial changes, briefly explain the implementation plan before editing. Make a focused change that follows the existing design and architecture; do not rebuild a working page or introduce dependencies without a clear need.
- Identify every affected route and user interaction. Validate the requested behavior itself, not just that the application compiles.

## React architecture and maintainability

- Use functional React components and hooks. Keep components focused, modular, and reusable; pass configurable behavior through clear props.
- Separate demonstration or provider data from presentation, and keep UI, data transformations, and business logic understandable and appropriately separated.
- Reuse existing components and helpers instead of duplicating UI or logic. Avoid premature abstractions, unnecessary dependencies, and overly compressed code.
- Use descriptive file, component, function, and variable names. Write code that an intermediate beginner can follow.
- Add concise, meaningful comments when they clarify important or non-obvious logic. Use JSDoc for reusable components, functions, and utilities when it improves understanding. Explain complex conditions, state management, and data transformations; do not narrate obvious code. Mark intentionally unfinished work with a specific `TODO`.
- Maintain accessibility and responsive behavior: semantic elements, associated labels, keyboard-operable controls, useful accessible names, and mobile-first layouts.

## Discovery and listing conventions

- Keep the discovery experience composable: search, price bounds, location, campus, room type, and facilities filters must work together, update the matching count, and have a clear reset path.
- Validate user-provided filter values and explain invalid combinations instead of silently returning misleading results.
- Keep prices clearly formatted as Ghanaian cedis (GHS) and state the pricing period when known.
- Clearly distinguish example content from real offers on both cards and property detail pages. Do not use words such as “available,” “verified,” or “reviewed” as factual claims for demonstration data.
- Build property detail routes from the shared property data. Keep photo galleries, amenities, room information, location, enquiry links, and their mobile layouts consistent with the listing.
- WhatsApp enquiries must use the configured contact details, identify demonstration listings as examples, and must not imply that an example provider or room is real.

## Security and dependencies

- Keep secrets and private contact data out of source control. Use the existing environment-variable pattern for configurable public contact details and document required variables in `.env.example` and `README.md`.
- Validate external links and use safe link attributes when opening new tabs. Do not add unsafe HTML rendering or collect personal data without an explicit product requirement.
- Prefer existing project dependencies. Before adding one, verify that the feature cannot reasonably use the current stack; after changes, check the dependency audit when available.

## Development and verification workflow

- Use the existing stack and scripts: React, Vite, React Router, Tailwind CSS v4 through its Vite plugin, and Lucide React. Follow the established `src/components`, `src/data`, `src/pages`, and `src/utils` structure unless there is a concrete reason to change it.
- Before substantial edits, summarize the plan. After implementation, summarize changed files, behavior, and important technical decisions in beginner-friendly language.
- Run `npm run build` for code changes and fix build regressions. Use the available focused test or browser tools to exercise affected behavior; at minimum check changed routes and interactions, including responsive behavior when relevant.
- When a request names particular checks (such as search, combined filters, navigation, or property details), run those checks explicitly and report the outcome. Do not claim a test passed unless it was run.
- Update `README.md` when setup, project structure, configuration, commands, or user-facing functionality changes. Explain unfamiliar architectural choices or technical concepts there when that helps the project owner learn.
