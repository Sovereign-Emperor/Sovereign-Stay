import { getStoredProviderProperties } from "../data/providerPropertyRepository";
import { getProviderEnquiries as getStoredProviderEnquiries } from "../data/providerEnquiryRepository";
import {
  createProviderListingRecord,
  deleteProviderListingRecord,
  getStoredListingOverrides,
  getStoredProviderListings,
  setProviderListingStatusRecord,
  updateProviderListingRecord,
} from "../data/providerListingRepository";
import {
  deleteRoomOffersForListing,
  getRoomOffersForListing,
  getRoomOffersForListings,
  replaceListingRoomOffers,
} from "../data/providerRoomOfferRepository";
import { getDemoPropertiesForProvider } from "../data/demoPropertyRepository";
import { demoListings } from "../data/properties";
import { demoProperties } from "../data/demoProperties";
import { toListingViewModel } from "../utils/listingViewModel";
import { DEMO_PROVIDER_ID } from "../data/demoProviderRepository";

export const ROOM_PRICING_PERIODS = [
  "monthly",
  "semester",
  "academic_year",
  "other",
];
export const ROOM_AVAILABILITY_STATUSES = [
  "unknown",
  "available",
  "limited",
  "unavailable",
];
export const LISTING_LIFECYCLE_STATUSES = ["draft", "published", "archived"];

function getOwnedProperties(providerId) {
  const demo = getDemoPropertiesForProvider(providerId);
  const stored = getStoredProviderProperties(providerId);
  const combined = [...demo, ...stored];
  const byId = new Map(combined.map((property) => [property.id, property]));
  return [...byId.values()];
}

function splitLines(value) {
  return value.split(/\r?\n/).map((part) => part.trim()).filter(Boolean);
}

export function validateRoomOffers(offers, { requireOne = false } = {}) {
  const errors = [];
  if (requireOne && offers.length === 0) {
    errors.push("Add at least one room offer before publishing this listing.");
  }
  offers.forEach((offer, index) => {
    const number = index + 1;
    if (!offer.roomType?.trim()) errors.push(`Room offer ${number}: enter a room type.`);
    if (!Number.isInteger(Number(offer.occupancy)) || Number(offer.occupancy) < 1) {
      errors.push(`Room offer ${number}: occupancy must be a positive whole number.`);
    }
    if (
      offer.quantity === "" ||
      offer.quantity == null ||
      !Number.isInteger(Number(offer.quantity)) ||
      Number(offer.quantity) < 0
    ) {
      errors.push(`Room offer ${number}: room quantity must be zero or more.`);
    }
    if (!Number.isFinite(Number(offer.price)) || Number(offer.price) <= 0) {
      errors.push(`Room offer ${number}: price must be greater than zero.`);
    }
    if (!ROOM_PRICING_PERIODS.includes(offer.period)) {
      errors.push(`Room offer ${number}: choose a supported rental period.`);
    }
    if (
      offer.deposit !== "" &&
      offer.deposit != null &&
      (!Number.isFinite(Number(offer.deposit)) || Number(offer.deposit) < 0)
    ) {
      errors.push(`Room offer ${number}: deposit must be zero or more.`);
    }
    if (!ROOM_AVAILABILITY_STATUSES.includes(offer.availabilityStatus)) {
      errors.push(`Room offer ${number}: choose a valid availability status.`);
    }
  });
  return errors;
}

export function validateListingValues(values, offers, { publishing = false } = {}) {
  const errors = {};
  const required = [
    ["name", "Enter a listing headline."],
    ["propertyId", "Choose one of your properties."],
    ["description", "Enter a listing description."],
    ["propertyType", "Choose an accommodation category."],
    ["locationSummary", "Enter a location summary."],
    ["institution", "Enter a nearby institution or select “Not institution-specific”."],
  ];
  required.forEach(([field, message]) => {
    if (!String(values[field] ?? "").trim()) errors[field] = message;
  });
  if (!ROOM_AVAILABILITY_STATUSES.includes(values.availabilityStatus)) {
    errors.availabilityStatus = "Choose an availability status.";
  }
  if (
    values.availableFrom &&
    Number.isNaN(Date.parse(`${values.availableFrom}T00:00:00`))
  ) {
    errors.availableFrom = "Enter a valid available-from date.";
  }
  const roomErrors = validateRoomOffers(offers, { requireOne: publishing });
  if (roomErrors.length) errors.roomOffers = roomErrors;
  return errors;
}

function normalizeListingValues(values) {
  return {
    ...values,
    facilityNames: Array.isArray(values.facilityNames) ? values.facilityNames : [],
  };
}

function mapRoomOffer(offer) {
  return {
    ...offer,
    roomTypeLabel: offer.roomType,
    pricePeriod: offer.period,
    currency: offer.currency ?? "GHS",
    exampleRoomCount: offer.quantity,
    availabilityStatus: offer.availabilityStatus,
  };
}

function getPropertyDisplayName(property) {
  return property.name
    ?? demoListings.find((listing) => listing.propertyId === property.id)?.name
    ?? "Example property";
}

function buildFixtureViewModel(fixture, ownerId, overrides, persistedOffers) {
  const listing = {
    ...fixture,
    ...(overrides ?? {}),
    ownerId,
    rooms: fixture.rooms,
    facilityIds: fixture.facilityIds,
    media: fixture.media,
  };
  const view = toListingViewModel(listing);
  const offers = persistedOffers.length
    ? persistedOffers.map(mapRoomOffer)
    : view.roomOffers.map((room) => ({
      ...room,
      roomTypeLabel: room.roomType,
      quantity: room.exampleRoomCount,
      period: room.pricePeriod,
      availabilityStatus: "unknown",
      description: "",
      deposit: null,
      features: "",
      currency: room.currency,
    }));

  return {
    ...view,
    name: overrides?.name ?? view.name,
    type: overrides?.propertyType ?? view.type,
    location: overrides?.locationSummary ?? view.location,
    school: overrides?.institution ?? view.school,
    description: overrides?.description ?? view.description,
    facilities: overrides?.facilityNames ?? view.facilities,
    rules: overrides ? splitLines(overrides.houseRules ?? "") : view.rules,
    utilities: overrides?.utilities ?? "",
    availableFrom: overrides?.availableFrom ?? "",
    availabilityStatus: overrides?.availabilityStatus ?? view.availabilityStatus,
    contactPreference: overrides?.contactPreference ?? "enquiry",
    viewingPreference: overrides?.viewingPreference ?? "",
    depositRequirements: overrides?.depositRequirements ?? "",
    roomOffers: offers,
    price: offers.length ? Math.min(...offers.map(({ price }) => Number(price))) : null,
    pricePeriod: offers[0]?.period ?? null,
    roomType: offers[0]?.roomTypeLabel ?? "Room details not provided",
    availableRooms: offers.reduce((count, offer) => count + Number(offer.quantity || 0), 0),
    lastUpdatedAt: overrides?.updatedAt ?? fixture.lastUpdatedAt,
    isDemo: true,
  };
}

function buildLocalViewModel(listing, property, offers) {
  const fixturePropertyListing = demoListings.find(({ propertyId }) => propertyId === property.id);
  const illustrativePhotos = fixturePropertyListing
    ? toListingViewModel(fixturePropertyListing).photos
    : [];
  const propertyPhotos = property.mediaManaged
    ? property.media
      .slice()
      .sort((first, second) =>
        Number(second.isCover) - Number(first.isCover) || first.sortOrder - second.sortOrder)
      .map((photo) => ({ ...photo, isLocal: true }))
    : illustrativePhotos;
  const mappedOffers = offers.map(mapRoomOffer);
  const location = [property.area, property.city, property.region].filter(Boolean).join(", ");
  return {
    id: listing.id,
    propertyId: property.id,
    ownerId: listing.ownerId,
    providerVerificationStatus: "unverified",
    propertyVerificationStatus: "unverified",
    availabilityStatus: listing.availabilityStatus,
    lastUpdatedAt: listing.updatedAt,
    status: listing.status,
    isDemo: true,
    name: listing.name,
    type: listing.propertyType,
    location: listing.locationSummary || location,
    area: property.area || listing.locationSummary,
    city: property.city,
    region: property.region,
    school: listing.institution,
    distanceKm: null,
    price: mappedOffers.length
      ? Math.min(...mappedOffers.map(({ price }) => Number(price)))
      : null,
    pricePeriod: mappedOffers[0]?.period ?? null,
    roomType: mappedOffers[0]?.roomTypeLabel ?? "Room details not provided",
    availableRooms: mappedOffers.reduce((count, offer) => count + Number(offer.quantity || 0), 0),
    roomOffers: mappedOffers,
    facilities: listing.facilityNames ?? [],
    description: listing.description,
    highlights: [],
    rules: splitLines(listing.houseRules ?? ""),
    photos: propertyPhotos,
    propertyName: getPropertyDisplayName(property),
    property,
    availableFrom: listing.availableFrom,
    utilities: listing.utilities,
    depositRequirements: listing.depositRequirements,
    contactPreference: listing.contactPreference,
    viewingPreference: listing.viewingPreference,
  };
}

function getFixtureListingsWithOverrides() {
  const propertiesById = new Map(demoProperties.map((property) => [property.id, property]));
  const overridesById = new Map(
    getStoredListingOverrides().map((listing) => [listing.id, listing]),
  );
  const persistedOffers = getRoomOffersForListings(demoListings.map(({ id }) => id));
  const offersByListingId = new Map();
  persistedOffers.forEach((offer) => {
    const offers = offersByListingId.get(offer.listingId) ?? [];
    offers.push(offer);
    offersByListingId.set(offer.listingId, offers);
  });
  return demoListings.map((fixture) => {
    const property = propertiesById.get(fixture.propertyId);
    return buildFixtureViewModel(
      fixture,
      property.ownerId,
      overridesById.get(fixture.id),
      offersByListingId.get(fixture.id) ?? [],
    );
  });
}

export function getProviderListings(providerId) {
  const ownedProperties = new Map(getOwnedProperties(providerId).map((property) => [property.id, property]));
  const fixtures = getFixtureListingsWithOverrides()
    .filter(({ ownerId, propertyId }) => ownerId === providerId && ownedProperties.has(propertyId));
  const stored = getStoredProviderListings(providerId)
    .filter((listing) => !demoListings.some((fixture) => fixture.id === listing.id))
    .filter((listing) => ownedProperties.has(listing.propertyId))
    .map((listing) => buildLocalViewModel(
      listing,
      ownedProperties.get(listing.propertyId),
      getRoomOffersForListing(listing.id),
    ));
  return [...stored, ...fixtures];
}

export function getProviderListingById(providerId, listingId) {
  return getProviderListings(providerId).find(({ id }) => id === listingId) ?? null;
}

export function getMarketplaceListings() {
  const fixtureListings = getFixtureListingsWithOverrides();
  const allProperties = new Map(
    [
      ...demoProperties,
      ...getStoredProviderProperties(DEMO_PROVIDER_ID),
      ...getStoredProviderProperties("demo-provider-b"),
    ].map((property) => [property.id, property]),
  );
  const fixtureIds = new Set(demoListings.map(({ id }) => id));
  const localListings = [...getStoredProviderListings(DEMO_PROVIDER_ID), ...getStoredProviderListings("demo-provider-b")]
    .filter((listing) => !fixtureIds.has(listing.id))
    .flatMap((listing) => {
      const property = allProperties.get(listing.propertyId);
      return property
        ? [buildLocalViewModel(listing, property, getRoomOffersForListing(listing.id))]
        : [];
    });
  return [...fixtureListings, ...localListings].filter(({ status }) => status === "published");
}

export function saveProviderListing(providerId, listingId, values, offers, { publishing = false } = {}) {
  const errors = validateListingValues(values, offers, { publishing });
  if (Object.keys(errors).length) {
    throw new Error(Object.values(errors).flat().join(" "));
  }
  const property = getOwnedProperties(providerId).find(({ id }) => id === values.propertyId);
  if (!property) {
    throw new Error("Choose a property owned by this provider. The listing was not saved.");
  }
  const cleanValues = normalizeListingValues(values);
  const current = listingId ? getProviderListingById(providerId, listingId) : null;
  if (listingId && !current) {
    throw new Error("This listing could not be found in your provider workspace.");
  }

  const previousOffers = listingId ? getRoomOffersForListing(listingId) : [];
  const listing = listingId
    ? updateProviderListingRecord(providerId, listingId, cleanValues, current)
    : createProviderListingRecord(providerId, cleanValues);
  try {
    replaceListingRoomOffers(listing.id, offers);
  } catch (error) {
    if (!listingId) deleteProviderListingRecord(providerId, listing.id);
    else replaceListingRoomOffers(listing.id, previousOffers);
    throw error;
  }
  return getProviderListingById(providerId, listing.id);
}

export function updateProviderListingStatus(providerId, listingId, status) {
  if (!LISTING_LIFECYCLE_STATUSES.includes(status)) {
    throw new Error("Choose a valid listing status.");
  }
  const listing = getProviderListingById(providerId, listingId);
  if (!listing) throw new Error("This listing could not be found in your provider workspace.");
  if (status === "published") {
    const errors = validateListingValues(
      {
        name: listing.name,
        propertyId: listing.propertyId,
        description: listing.description,
        propertyType: listing.type,
        locationSummary: listing.location,
        institution: listing.school === "Not institution-specific" ? "Not institution-specific" : listing.school,
        availabilityStatus: listing.availabilityStatus,
        availableFrom: listing.availableFrom,
      },
      getRoomOffersForListing(listingId).length
        ? getRoomOffersForListing(listingId)
        : listing.roomOffers,
      { publishing: true },
    );
    if (Object.keys(errors).length) {
      throw new Error(Object.values(errors).flat().join(" "));
    }
  }
  const rawListing = getStoredProviderListings(providerId).find(({ id }) => id === listingId);
  const fixture = demoListings.find(({ id }) => id === listingId);
  const baseListing = rawListing ?? fixture;
  if (!baseListing) throw new Error("This listing could not be found in your provider workspace.");
  setProviderListingStatusRecord(providerId, listingId, status, baseListing);
  return getProviderListingById(providerId, listingId);
}

export function deleteProviderListing(providerId, listingId) {
  const hasEnquiries = getStoredProviderEnquiries(providerId)
    .some((enquiry) => enquiry.listingId === listingId);
  if (hasEnquiries) {
    throw new Error("This listing has enquiries and cannot be deleted. Archive it to preserve the enquiry history.");
  }
  const listing = getProviderListingById(providerId, listingId);
  if (!listing) throw new Error("This listing could not be found in your provider workspace.");
  if (demoListings.some((fixture) => fixture.id === listingId)) {
    throw new Error("Demonstration fixture listings cannot be permanently deleted; archive them instead.");
  }
  const deleted = deleteProviderListingRecord(providerId, listingId);
  deleteRoomOffersForListing(listingId);
  return deleted;
}
