# Sovereign Stay data model and growth architecture

This document describes the browser-local demonstration marketplace and the
planned/implemented Supabase data model. Supabase email authentication and
server-side administrative/payment scaffolding exist, but the marketplace UI
still uses local demo repositories. No migration has yet been applied or
validated against a local PostgreSQL instance, and there is no remote project.

## Current folder architecture

```text
src/
  components/                 Reusable visual pieces (cards, gallery, images)
  data/
    properties.js             Related marketplace demo records and catalogues
    demoProperties.js         Physical demo property identities and ownership
    demoPropertyRepository.js Provider-scoped property lookup
    demoListingRepository.js  Local repository adapter for the demo records
    providerPropertyRepository.js Browser-local provider property CRUD
    propertyImageRepository.js IndexedDB photo-blob storage
  data/supabaseClient.js      Lazy-loaded public Supabase client
  auth/                       Supabase session context
  hooks/
    useListings.js            React loading, errors, request races, and paging
  pages/                      Route-level homepage, detail, and About screens
  services/
    listingService.js         Demo search/detail/filter-options boundary
    authService.js            Supabase auth and provider onboarding
    adminService.js           Restricted administrator RPC adapter
  utils/
    listingViewModel.js       Maps normalized records into the existing UI shape
    propertyFilters.js        Price validation and composable filter logic
  App.jsx                     Shared shell and client-side routes
```

The service methods are the page-facing data contract. The local adapter keeps
this MVP self-contained. A later API adapter can implement the same search,
detail, and filter-option operations and send filters and pagination to a
server. Components do not import the fixture array.

Milestone 005A adds the initial versioned schema; the later operations
migration adds enquiries, bookings, payments, reports, reviews, notifications,
audit events, storage policy, and server-side payment functions. It does not
replace local demo repositories or prove those policies are correct. See
`docs/supabase-setup.md` for setup and validation status.

## Proposed platform folder architecture

Add these modules only as their milestones are implemented:

```text
src/
  features/
    auth/                     Sign-in screens and session state
    provider-listings/        Provider dashboard and listing editor
    admin-moderation/         Review queues, reports, and verification tools
    enquiries/                Provider inbox and student viewing requests
  services/
    listingService.js         Stable listing use cases and result contract
    enquiryService.js         Enquiry and viewing-request use cases
    mediaService.js           Upload request and media-processing coordination
  data/
    demoListingRepository.js  Development-only fixture adapter
    supabaseListingRepository.js  Future Supabase adapter
  hooks/
    useListings.js            Shared React integration with listing use cases
```

Keep UI grouped by product feature as it grows. Repositories handle data
transport; services express application operations; components render data.
Server-side authorization and validation remain mandatory even when the
frontend hides actions.

## Core entities and relationships

| Entity | Important fields | Relationship / purpose |
|---|---|---|
| User | `id`, `displayName`, `roleIds`, account state | One user can have one or more roles and can be a member of multiple provider businesses. |
| Role / permission | role id; permission identifiers | Describes student, provider, and administrator capabilities. These frontend definitions are explanatory only; the backend must enforce permissions. |
| Provider business | `id`, display name, verification status | A business can have multiple authorized user memberships and manage multiple properties. |
| Property | `id`, `providerBusinessId`, `locationId`, name, property type, verification status | Each property belongs to one provider business; a property can have multiple listings. |
| Listing | `id`, `propertyId`, `status`, `name`, `institutionIds`, description | A listing belongs to a property and holds the discoverable offering and moderation lifecycle. |
| Room | `id`, `listingId`, `roomTypeId`, occupancy, price amount/currency/period | One listing can have multiple room types and distinct prices. |
| Room type | `id`, label, occupant count | Shared catalogue referenced by rooms, e.g. “2 in a room”. |
| Facility / amenity | `id`, label | Shared catalogue; listings reference facilities by id. |
| Location | `id`, area, city, region, country, optional coordinates | Listings reference a location. Coordinates can be added when a provider supplies an accurate pin. |
| Institution | `id`, name, location | A listing can target one or more institutions; distance is specific to the location/institution pair. |
| Listing media | `id`, `listingId`, kind, storage key, order, cover flag, alt text, moderation state | One listing can have many photos and videos. Store media metadata and object-storage keys, not file bytes in listing records. |
| Availability | listing/room reference, status, reported quantity, confirmation time | Kept separate from moderation and verification; it can become stale independently. |
| Enquiry / viewing request | student/contact reference, listing/room reference, kind, message, status, timestamps | A provider can receive many enquiries across multiple listings. Viewing requests can be modelled as a specific enquiry kind or a linked entity. |
| Verification case | subject type/id, status, evidence references, reviewer, decision time | Tracks provider and property checks separately, with an audit trail. |
| Moderation action | listing, administrator, action, reason, timestamp | Records approval, rejection, removal, and other administrative decisions. |
| Report | reporter, listing, reason, description, status, timestamps | Supports review queues and a record of the outcome. |
| Review | author, listing, optional room/stay reference, rating, text, moderation state | Future-only. Reviews must be tied to a real, eligible interaction before being presented as trustworthy. |

### Supabase schema staged in migrations

The initial migration creates the core marketplace tables; the operations
migration adds eight transaction/trust tables, for 26 relational tables total:

- Identity and roles: `profiles`, `roles`, `user_roles`.
- Provider ownership/team access: `provider_businesses`,
  `provider_business_memberships` (`owner`, `manager`, `editor`).
- Geography/catalogues: `locations`, `institutions`, `room_types`, `facilities`.
- Property and discovery: `properties`, `listings`, `listing_institutions`,
  `listing_rooms`, `property_facilities`.
- Media and availability: `listing_media`, `availability`.
- Administrative audit: `moderation_actions`, `verification_events`.
- Student/provider workflows: `enquiries`, `bookings`, `booking_events`.
- Payments and trust: `payments`, `reviews`, `listing_reports`,
  `notifications`, `platform_audit_events`.

The hierarchy is `provider_business -> properties -> listings -> listing_rooms`.
`listing_rooms` holds amount, currency, pricing period, occupancy, quantity, and
active state. A listing may reference many institutions and media records.
Media rows store bucket/path metadata for images or videos, not file bytes.
Provider verification, property verification, listing publication, and
availability are stored independently.

Saved-property synchronization is not implemented. A private `listing-media`
bucket is declared in the later migration, but no image processing pipeline or
frontend upload flow is connected. Migration policy correctness remains
unverified until local database tests are run.

### Example record shapes

The following are proposed API/database shapes, not active API payloads.
Identifiers are stable strings in the demo; a database may use UUIDs.

```json
{
  "id": "listing-id",
  "propertyId": "property-id",
  "status": "draft",
  "name": "Example student residence",
  "propertyType": "Student hostel",
  "locationId": "location-id",
  "institutionIds": ["institution-id"],
  "rooms": [
    {
      "id": "room-id",
      "roomTypeId": "double",
      "occupantCount": 2,
      "price": { "amount": 2800, "currency": "GHS", "period": "semester" }
    }
  ],
  "facilityIds": ["wifi", "water"],
  "media": [
    {
      "id": "media-id",
      "kind": "photo",
      "storageKey": "listings/listing-id/media/media-id",
      "sortOrder": 0,
      "isCover": true,
      "altText": "Exterior of an example residence",
      "moderationStatus": "approved",
      "createdAt": "ISO-8601 timestamp"
    }
  ],
  "availability": {
    "status": "unknown",
    "reportedRoomsAvailable": null,
    "lastConfirmedAt": null
  },
  "propertyVerificationStatus": "unverified",
  "lastUpdatedAt": "ISO-8601 timestamp"
}
```

Video records use the same media collection with `kind: "video"` and can add
duration, poster-image id, and transcoding state. A listing may have zero or
many media records of either kind. An uploaded media row should also record
the uploader and file metadata needed for validation and processing.

```json
{
  "id": "provider-user-id",
  "displayName": "Provider display name",
  "roleIds": ["provider"],
  "providerVerificationStatus": "unverified",
  "accountStatus": "active"
}
```

Enquiries and related future records should use separate entities, for example:

```json
{
  "id": "enquiry-id",
  "listingId": "listing-id",
  "roomId": "room-id",
  "studentUserId": "student-user-id",
  "providerUserId": "provider-user-id",
  "kind": "viewing_request",
  "status": "new",
  "message": "I would like to request a viewing.",
  "createdAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp"
}
```

Use `enquiryStatuses` (`new`, `in_progress`, `resolved`, `closed`) for
provider follow-up. A report links its reporter and listing to a reason,
description, review status, and resolution history. A review links an
eligible author and listing (and, when appropriate, a completed stay), a
rating/text, and a moderation status. The demo does not contain real users,
enquiries, reports, or reviews.

### User roles and permissions

The starter role catalogue contains:

- **Student:** discover published listings, create enquiries/viewing requests,
  and report a listing.
- **Provider:** create listings; read/update/archive only owned listings;
  update availability and respond to enquiries for owned listings.
- **Administrator:** manage users, moderate all listings, review reports, and
  manage verification.

An application role is not proof of identity or authorization. The future
backend must derive the signed-in user from a secure session and check every
operation against server-side ownership and permissions. Never trust a client
supplied `ownerId`, role, or permission.

### Listing lifecycle and trust are separate

Listing `status` uses these lifecycle values:

1. `draft` — editable and private to its provider.
2. `pending_approval` — submitted for review, not yet discoverable.
3. `published` — approved for public discovery.
4. `rejected` — not approved; a reason should be retained for the provider.
5. `archived` — removed from discovery while preserving its history.

The UI must not infer verification or availability from lifecycle status.
The database keeps these independent:

- Provider verification: `provider_businesses.verification_status`.
- Property verification: `properties.verification_status`.
- Availability: `availability.status`, plus when it was last confirmed.
- Listing freshness: `listings.updated_at`, maintained by a database trigger.

The demo providers and listings are unverified; demo availability is
`unknown`; fixture `lastUpdatedAt` values may be `null`. Fixture listings are
marked `published` only so the local demonstration marketplace has example
discovery content. Student discovery still filters strictly to `published`;
provider-created drafts remain hidden until explicitly published in the local
demo. This status is not evidence of real publication, moderation, or
verification. A production repository must return only eligible,
server-approved `published` listings.

## Media and uploads

The `media` collection on a listing allows any number of `photo` and `video`
records. A record carries display/order metadata and a `storageKey` rather
than embedding a file. The current Unsplash fixture records use
`demoPhotoId` instead and do not represent listing-specific property photos.

When uploads are implemented:

1. An authenticated provider requests an upload for a listing they own.
2. The API checks ownership, file type, size limits, and listing state, then
   issues a short-lived upload authorization for private object storage.
3. The browser uploads directly to storage; the API records a media metadata
   row and queues virus scanning, image resizing/video transcoding, and
   moderation.
4. A delivery URL or CDN reference is resolved from the storage key. Only
   media eligible for display is returned to public listing queries.
5. Removing/replacing a listing image also updates its cover/order metadata
   and safely schedules the old object for deletion.

Credentials for storage and signing must remain on the server. Do not put
storage secrets in `VITE_` variables or the browser bundle.

## Searching and pagination

The listing service accepts filters, sort order, `page`, and `pageSize`, and
returns `{ items, total, page, pageSize, hasNextPage }`. The demo adapter
filters and slices its small in-memory fixture set. That is suitable only for
this MVP.

For thousands of listings, the API/database adapter must apply filtering,
sorting, and pagination before returning records. Add database indexes for
published listing status, institution/location, price, room type, and
facility relationships based on measured query plans. Search text should use
a database-supported text index; avoid downloading all listings and filtering
them in the browser. For rapidly changing datasets, prefer cursor pagination
with a stable sort key over large offset pages. Return the total only when the
product needs it, since exact counts can be expensive.

## Current fixture shape

`src/data/properties.js` contains related listing records keyed by stable IDs.
Each demo listing references a physical property through `propertyId`;
`src/data/demoProperties.js` stores the property owner. This mirrors the
database relationship where a provider business owns properties and their
listings and room offers belong beneath each property. It allows multiple team
members to manage multiple properties without assigning a listing directly
to an individual account. The demo listing also uses `locationId`,
`institutionIds`, room type IDs, and facility IDs instead of copying those
entities into each listing. Its
`rooms`, `media`, `availability`, verification state, and freshness timestamp
are separate fields. `src/utils/listingViewModel.js` joins those references
and maps the first room and its photos to the flat shape currently consumed
by the existing cards and details page.

That view model is a UI compatibility layer, not a second source of truth.
When the UI needs multiple rooms, videos, or verified trust indicators, add
those features by adapting the view model and reusable components rather
than duplicating listing data.

The initial SQL schema withholds internal creator and membership identifiers
from ordinary public-facing table reads. Provider-scoped access to those
management fields and rejected-listing reasons will need explicit owner-
authorized API operations as the dashboard and review experience are built.
The first migration intentionally does not allow editing published listings
or reactivating archived listings until their moderation workflow is designed.
Properties containing a published listing are also read-only to providers in
this first policy set, so property edits require a later moderated workflow.

## Provider dashboard foundation (Milestone 006.1)

The React app now has a demo-only provider workspace at `/provider`. Its
`demoProviderRepository` scopes the existing demo listings to one example
provider, and `providerDashboardService` adapts those records and calculates
summary counts for the UI. Reusable provider components render the navigation,
summary cards, listing states, and property summaries. Add-property and
enquiry destinations exist as explicit placeholders; property details are
read-only. The sample enquiry count is illustrative, and no provider action is
persisted.

This route is not authentication or authorization. The current fixture model
links demo properties to example user IDs and listings to properties, while
the intended database relationship remains provider business → properties →
listings. Do not use this demo dashboard to manage real accommodation or
infer real availability, verification, enquiry volume, or access control.

## Provider property management (Milestone 006.2)

The demo data now distinguishes physical properties from their advertisements.
`src/data/demoProperties.js` contains minimal property records with a stable ID
and demo owner; `demoPropertyRepository.js` provides provider-scoped lookups.
Each listing in `src/data/properties.js` references one physical property by
`propertyId`; multiple listings can reference the same property. Property
names, locations, types, photos, and room offers are derived from linked
listings and shared catalogues rather than copied into property fixtures.

`providerDashboardService` groups listings by property ID and builds the
property summary used by the dashboard and management pages. `/provider/properties`
searches by property name, filters by listing lifecycle status, and calculates
property-level metrics. `/provider/properties/:propertyId` shows the physical
property summary and each linked listing with its room offers and prices.
Listing statuses remain separate from property verification and availability.

The current sample has one listing per property, but grouping supports multiple
advertisements attached to one property. Search and status filters are local to this small demo. Listing and room-offer
creation, authentication, server-side ownership checks, and backend persistence
remain deferred.

## Property creation form (Milestone 006.3.1)

`/provider/properties/new` contains a client-side property details form.
Required name, accommodation type, region, city, and area fields are validated
inline; description, address, and nearby institution are optional. These initial
validation-only limits were superseded by Milestone 006.3.4 below.

## Property location details (Milestone 006.3.2)

The property form uses the reusable `src/data/ghanaRegions.js` catalogue for
the complete set of 16 Ghana regions. Region selection is required and
validated against that catalogue; city/town and area/neighbourhood remain
required text fields rather than an incomplete city lookup. Street/address
and nearby institution are optional. The form groups identity, primary
location, and additional location details separately.

## Property photo preview interface (Milestone 006.3.3)

`ProviderImageUpload` accepts multiple JPG/JPEG, PNG, and WebP files up to
5 MB each. It creates browser object URLs for thumbnail previews, allows
removing photos and choosing a cover, and revokes URLs on removal and component
cleanup. Invalid formats and oversized files produce accessible errors; a
thumbnail that cannot be previewed falls back to a clear message.

## Provider property workflow (Milestone 006.3.4)

The provider repository at `src/data/providerPropertyRepository.js` stores
small property records in versioned browser `localStorage`. Photos are stored
as blobs in the `property-images` IndexedDB object store, with property records
keeping only photo metadata, order, and cover selection. The service layer
merges these provider-owned records with immutable demonstration fixtures so
the dashboard, search, filters, and property details use one view-model path.

Create and edit save physical property records only; they do not create or
modify advertisements, room offers, or fixture listing relationships. The edit
route can store a local override for a fixture property while preserving its
associated listings. Deletion requires confirmation and is blocked when any
listing or room offer remains linked. A successful property delete never
cascades into listing data. Browser storage can be cleared or unavailable, and
there is no account synchronization, server backup, or backend authorization;
this is a demonstration persistence adapter only.

## Not included in the Milestone 004 baseline

There is no sign-in/session implementation, server-side permission
enforcement, provider listing/room-offer creation, admin console, connected
database/API, remote upload pipeline, real enquiry persistence, report
workflow, or review workflow. Those need separate milestones with backend
validation, privacy/security design, and integration tests.

## Local provider marketplace workflow (Milestone 006.4)

The browser demo now has separate repositories and service logic for provider
listings, room offers, and student enquiries. The storage adapters are:

- `providerListingRepository.js` stores listing records and fixture overrides.
- `providerRoomOfferRepository.js` stores room offers independently from
  their parent listing.
- `providerEnquiryRepository.js` stores enquiry submissions and status changes.
- Existing property metadata remains in `providerPropertyRepository.js`;
  locally selected property photo blobs remain in IndexedDB.

New records have stable local IDs and explicit `ownerId`, `propertyId`, and
`listingId` relationships. A property can have multiple listings, and a
listing can have multiple room offers. Service operations verify that the
selected property belongs to the current demo provider. These checks are
client-side demo scoping only; they are not authentication or authorization.

Listing status is `draft`, `published`, or `archived`. Draft and archived
records are excluded from student discovery. Publishing and unpublishing only
change local browser visibility; there is no public marketplace server,
moderation, or verified status. Publishing requires at least one valid room
offer. Each offer has its own room type, occupancy, quantity, GHS price,
rental period, optional deposit, availability, and features. The local form
supports `monthly`, `semester`, `academic_year`, and `other` periods and uses
`unknown` when availability has not been confirmed.

Students can submit an enquiry against a published listing. An enquiry
retains the related listing, property, and provider IDs, plus the submitted
name, email, phone, message, optional viewing date, status, and timestamps.
Provider inbox reads and status updates are scoped to that demo provider.
Statuses are stored as `new`, `in_progress`, or `closed`; the interface labels
`in_progress` as “Contacted”. A short repeat-submission window prevents an
accidental duplicate. This is not real-time communication or a secure
messaging channel.

The local record repositories use versioned `localStorage` keys, while
property image blobs use IndexedDB. Browser storage can be read or changed by
the person using that browser and may be cleared or unavailable. Enquiry
contact information is therefore demonstration data only and must not be used
for real personal or sensitive information. The local layer is not a backend,
account-level persistence, or a production privacy boundary.

The Supabase schema is not connected to the student/provider marketplace UI
and does not mirror every local form field. In particular, the SQL rental
periods (`month`, `semester`, `academic_year`) do not yet match the local
`monthly`/`other` values; the database enquiry relationship is present but no
live enquiry repository is wired. Resolve these differences in a reviewed
migration before integrating the live repositories. Never treat local records
as SQL-backed or migrate them implicitly.

## Current integration boundary

- **Authentication scaffold:** Supabase email registration, sign-in, email-link
  callback, password reset, session loading, profile/role reads, protected
  routes, and provider business onboarding use the public Supabase client.
  Email delivery and authorization still require project configuration and
  real database testing. The registration account-type field is only routing
  metadata; it never grants provider or administrator permission.
- **Administration scaffold:** `/admin` loads a capped set of records and uses
  database RPCs for moderation, verification, reports, reviews, and account
  state. The SQL functions enforce roles and record audit events. No
  administrator can be self-assigned from the frontend.
- **Payment scaffold:** Edge Functions initialize and server-verify Paystack
  transactions; the browser callback never marks a payment successful by
  itself. SQL idempotency and booking/payment transition functions are present.
  There is no booking request UI or payment initiation UI, and the functions
  have not been tested against a sandbox project.
- **Not integrated:** The student/provider property, listing, room-offer, and
  enquiry screens continue to use local demo repositories in demo mode.
  Supabase mode blocks these marketplace routes rather than silently showing
  local demo records as production data.
- **Not launch-ready:** Database migrations, RLS policy tests, real email
  delivery, image processing, server-backed marketplace repositories, booking
  history, provider booking queue, sandbox payment flow, SEO/domain setup,
  monitoring, and deployment remain incomplete or unverified.
