# Sovereign Stay data model and growth architecture

This document describes the Milestone 004 model and the boundaries already
present in the frontend. The application still uses local demonstration data:
there is no database, real account, upload flow, moderation workflow, or API.

## Current folder architecture

```text
src/
  components/                 Reusable visual pieces (cards, gallery, images)
  data/
    properties.js             Related marketplace demo records and catalogues
    demoListingRepository.js  Local repository adapter for the demo records
  hooks/
    useListings.js            React loading, errors, request races, and paging
  pages/                      Route-level homepage, detail, and About screens
  services/
    listingService.js         Search/detail/filter-options application boundary
  utils/
    listingViewModel.js       Maps normalized records into the existing UI shape
    propertyFilters.js        Price validation and composable filter logic
  App.jsx                     Shared shell and client-side routes
```

The service methods are the page-facing data contract. The local adapter keeps
this MVP self-contained. A later API adapter can implement the same search,
detail, and filter-option operations and send filters and pagination to a
server. Components do not import the fixture array.

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
    api/                      Future HTTP repository implementations
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
| User | `id`, `displayName`, `roleIds`, account state, provider verification state | One user can have one or more roles. A provider user can own many listings. |
| Role / permission | role id; permission identifiers | Describes student, provider, and administrator capabilities. These frontend definitions are explanatory only; the backend must enforce permissions. |
| Listing | `id`, `ownerId`, `status`, `name`, property type, `locationId`, `institutionIds`, description | `ownerId` references a provider user. Each listing has exactly one owner; a provider can own many. |
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

### Example record shapes

The following are proposed API/database shapes, not active API payloads.
Identifiers are stable strings in the demo; a database may use UUIDs.

```json
{
  "id": "listing-id",
  "ownerId": "provider-user-id",
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
Keep these independent:

- Provider verification: `users.providerVerificationStatus`.
- Property verification: `listings.propertyVerificationStatus`.
- Availability: `listings.availability.status`, plus when it was last confirmed.
- Listing freshness: `listings.lastUpdatedAt`, updated by successful edits.

The demo providers and listings are unverified; demo availability is
`unknown`; demo `lastUpdatedAt` values are `null`. Demo listing fixtures have
`draft` status, but the **demo-only repository intentionally exposes those
fixtures** so the current discovery experience remains populated. A
production repository must return only eligible `published` listings.

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

`src/data/properties.js` contains related records keyed by stable ids. A
listing uses `ownerId`, `locationId`, `institutionIds`, room type ids, and
facility ids instead of copying those entities into each listing. Its
`rooms`, `media`, `availability`, verification state, and freshness timestamp
are separate fields. `src/utils/listingViewModel.js` joins those references
and maps the first room and its photos to the flat shape currently consumed
by the existing cards and details page.

That view model is a UI compatibility layer, not a second source of truth.
When the UI needs multiple rooms, videos, or verified trust indicators, add
those features by adapting the view model and reusable components rather
than duplicating listing data.

## Not included in Milestone 004

There is no sign-in/session implementation, server-side permission
enforcement, provider dashboard, admin console, database, API, upload
pipeline, enquiry persistence, report workflow, or review workflow. Those
need separate milestones with backend validation, privacy/security design,
and integration tests.
