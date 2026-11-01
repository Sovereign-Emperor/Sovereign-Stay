# Local Supabase development setup

This guide covers the Milestone 005A database foundation. It does not configure
the frontend to use Supabase, create accounts, upload media, or connect a remote
project. The React app continues to use its local demo repository.

## Required tools

- Node.js and npm for the existing frontend.
- Supabase CLI for local Supabase commands.
- Docker Desktop (or a compatible Docker Engine) running for Supabase local
  services.

At the time this foundation was prepared, the Supabase CLI, Docker CLI, and
PostgreSQL command-line client were not available in the development
environment. The repository structure and SQL were therefore prepared without
starting a local database. Use the official Supabase CLI installation guide
for your operating system; do not install a global CLI through an untrusted
script.

## Start the local stack

From the repository root, after installing the CLI and starting Docker:

```sh
supabase start
```

The local API, database, Studio, and email-testing endpoints are shown in the
CLI output. This project has not been linked to any remote Supabase project.

Apply migrations and seed the local database:

```sh
supabase db reset
```

`db reset` recreates the local database, applies every file in
`supabase/migrations/`, then applies `supabase/seed.sql`. It deletes local
development database contents, so use it only when resetting local data is
acceptable.

The auth-user trigger expects the seeded `student` role to exist before
sign-up. `db reset` applies the configured seed after migrations; do not enable
account creation against a database where the role seed has not been applied.

Useful local checks:

```sh
supabase status
supabase migration list
supabase db lint --local
```

`db lint` availability and options can vary by CLI version. If that command is
not available, use the installed CLI's `supabase db --help` and run the local
reset plus the database policy tests added in a later milestone.

Stop local services when finished:

```sh
supabase stop
```

## Migration and seed files

- `supabase/config.toml` configures the local project ports and API schema.
- `supabase/migrations/20261101000100_initial_marketplace_schema.sql` creates
  the initial tables, constraints, indexes, helper functions, and RLS policies.
- `supabase/seed.sql` inserts roles, common room types, and facility names only.
  It does not create users, listings, credentials, or public demo accommodation.

Create future migrations with the CLI:

```sh
supabase migration new descriptive_change_name
```

Edit the generated SQL migration, then validate locally with `supabase db
reset` before committing it. Treat committed migrations as the schema history;
do not edit an already-applied migration to make changes to an existing
environment—add a new migration instead.

## Environment variables

No Supabase client is used by the frontend in this milestone. When a later
approved milestone connects the frontend, only public client configuration
belongs in Vite variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Use the project’s current `.env.example` pattern for documenting public
configuration, and keep machine-specific values in `.env.local`. The existing
`.gitignore` already excludes `.env` and `.env.*` while allowing
`.env.example`.

**Never place a database password, access token, service-role key, or other
secret in a `VITE_` variable.** Vite bundles `VITE_` values into browser
JavaScript. RLS is required even with the public anon key. Service-role keys
bypass RLS and must only be used in a trusted server/automation environment
with tightly controlled access.

## Linking a remote development project later

This repository is intentionally not linked to a remote project. When a
separate development Supabase project has been created and its owner approves
remote work, install/authenticate the CLI and link using its project reference:

```sh
supabase login
supabase link --project-ref YOUR_DEVELOPMENT_PROJECT_REF
supabase db push
```

Do not use production project references for development. Do not put database
passwords on command lines, in source control, or in this documentation.
Review the migration diff, target project, backups, RLS behavior, and approval
before any future remote migration. No remote password was requested or used
for this milestone.

## Security notes

- RLS is enabled for every application table in the initial migration.
- Anonymous reads are limited to published listings and associated public-safe
  records. Lookup catalogues are public; profiles and business membership data
  are not.
- Creator IDs, provider business IDs, uploader IDs, and availability editor
  IDs are not granted to ordinary public-facing reads.
- Provider access follows database business membership, never a role or
  `ownerId` supplied by the browser.
- No client policy can mutate `user_roles`. The provider onboarding and
  membership functions only create a business for the signed-in user or add
  an existing user as manager/editor when called by that business's owner.
- Publishing and verification changes are limited to narrow administrator
  functions. There is no default admin account or self-service admin role
  assignment.
- `SECURITY DEFINER` functions fix `search_path`, use qualified table names,
  have execute grants restricted to authenticated users, and perform their
  own authorization checks. Re-review these functions as they evolve.
- Initial authenticated clients receive only public-safe columns on properties,
  listings, media, and availability. Query explicit allowed columns rather
  than `*`; owner-only rejection reasons and management identifiers need
  future owner-authorized operations.
- This foundation intentionally prevents providers from editing published
  listings or reactivating archived listings until the moderated edit workflow
  is implemented. Membership invitation UX and owner-only review details also
  remain future work.
- The migration does not create a Storage bucket or Storage policies. Media
  metadata is modeled, but uploads must wait for a separate implementation
  with private storage, ownership validation, file restrictions, and policy
  tests.

## Current limitation

The migration has not yet been applied or parsed by PostgreSQL because the
required local Supabase CLI and Docker services were unavailable. Before using
this schema for real accounts, run `supabase db reset` locally and add
automated RLS tests using anonymous, student, separate provider-business,
manager/editor, and administrator identities.
