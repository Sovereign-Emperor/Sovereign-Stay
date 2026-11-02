import {
  demoUsers,
  facilities,
  institutions,
  locations,
  roomTypes,
} from "../data/properties";
import { demoProperties } from "../data/demoProperties";

const usersById = new Map(demoUsers.map((user) => [user.id, user]));
const propertiesById = new Map(demoProperties.map((property) => [property.id, property]));
const facilitiesById = new Map(facilities.map((facility) => [facility.id, facility]));
const institutionsById = new Map(institutions.map((institution) => [institution.id, institution]));
const locationsById = new Map(locations.map((location) => [location.id, location]));
const roomTypesById = new Map(roomTypes.map((roomType) => [roomType.id, roomType]));

/**
 * Page-ready listing shape that preserves the fields used by existing UI.
 *
 * @typedef {Object} ListingViewModel
 * @property {string} id
 * @property {string} propertyId
 * @property {string} ownerId
 * @property {string} providerVerificationStatus
 * @property {string} propertyVerificationStatus
 * @property {string} availabilityStatus
 * @property {string | null} lastUpdatedAt
 * @property {string} status
 * @property {boolean} isDemo
 * @property {string} name
 * @property {string} type
 * @property {string} location
 * @property {string} area
 * @property {string} school
 * @property {number | null} distanceKm
 * @property {number} price
 * @property {string} pricePeriod
 * @property {string} roomType
 * @property {number} availableRooms
 * @property {string[]} facilities
 * @property {string} description
 * @property {string[]} highlights
 * @property {string[]} rules
 * @property {string[]} photos
 */

function requireRelatedRecord(records, id, relationName, listingId) {
  const record = records.get(id);

  if (!record) {
    throw new Error(`Listing "${listingId}" references an unknown ${relationName} "${id}".`);
  }

  return record;
}

/**
 * Adapt a normalized listing and its related records to the current page/card
 * shape. Keeping this translation in one place lets UI components stay stable
 * while the underlying data moves to an API.
 *
 * @param {import("../data/properties").demoListings[number]} listing
 * @returns {ListingViewModel}
 */
export function toListingViewModel(listing) {
  const property = requireRelatedRecord(
    propertiesById,
    listing.propertyId,
    "property",
    listing.id,
  );
  const owner = requireRelatedRecord(usersById, property.ownerId, "provider", listing.id);
  const location = requireRelatedRecord(
    locationsById,
    listing.locationId,
    "location",
    listing.id,
  );
  const institution = requireRelatedRecord(
    institutionsById,
    listing.institutionIds[0],
    "institution",
    listing.id,
  );
  const primaryRoom = listing.rooms[0];
  const roomType = requireRelatedRecord(
    roomTypesById,
    primaryRoom.roomTypeId,
    "room type",
    listing.id,
  );

  return {
    id: listing.id,
    propertyId: listing.propertyId,
    ownerId: property.ownerId,
    providerVerificationStatus: owner.providerVerificationStatus,
    propertyVerificationStatus: listing.propertyVerificationStatus,
    availabilityStatus: listing.availability.status,
    lastUpdatedAt: listing.lastUpdatedAt,
    status: listing.status,
    isDemo: listing.isDemo,
    name: listing.name,
    type: listing.propertyType,
    location: location.label,
    area: location.area,
    city: location.city,
    region: location.region.replace(/\s+Region$/i, ""),
    school: institution.name,
    distanceKm: location.distanceKmByInstitution[institution.id],
    price: primaryRoom.price.amount,
    pricePeriod: primaryRoom.price.period,
    roomType: roomType.label,
    availableRooms: primaryRoom.exampleRoomCount,
    roomOffers: listing.rooms.map((room) => {
      const roomType = requireRelatedRecord(
        roomTypesById,
        room.roomTypeId,
        "room type",
        listing.id,
      );

      return {
        id: room.id,
        roomType: roomType.label,
        occupancy: roomType.occupants,
        price: room.price.amount,
        currency: room.price.currency,
        pricePeriod: room.price.period,
        exampleRoomCount: room.exampleRoomCount,
      };
    }),
    facilities: listing.facilityIds.map(
      (facilityId) =>
        requireRelatedRecord(facilitiesById, facilityId, "facility", listing.id).label,
    ),
    description: listing.description,
    highlights: listing.highlights,
    rules: listing.rules,
    photos: listing.media
      .filter((mediaItem) => mediaItem.kind === "photo")
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map((photo) => photo.demoPhotoId),
  };
}
