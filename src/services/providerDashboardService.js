import { getDemoProviderWorkspace } from "../data/demoProviderRepository";
import {
  createProviderPropertyRecord,
  deleteProviderPropertyRecord,
  getStoredProviderProperties,
  getStoredProviderProperty,
  updateProviderPropertyRecord,
} from "../data/providerPropertyRepository";
import { getPropertyImages } from "../data/propertyImageRepository";
import { toListingViewModel } from "../utils/listingViewModel";
import { getPropertyImageError } from "../utils/propertyImageValidation";
import { validatePropertyForm } from "../utils/propertyFormValidation";
import { getProviderListings } from "./providerListingService";
import { getProviderEnquiries } from "./enquiryService";

/**
 * Convert linked demo listing records into property-level data for provider UI.
 * The property record owns identity; names, location, imagery, and offers come
 * from its listings so those values are not copied into another fixture.
 *
 * @param {object[]} properties Physical properties owned by a provider.
 * @param {object[]} listings Listings belonging to that provider.
 * @returns {object[]} Property summaries with their associated listing models.
 */
export function buildProviderPropertyViewModels(properties, listings) {
  const listingModels = listings.map((listing) =>
    Array.isArray(listing.roomOffers) ? listing : toListingViewModel(listing));

  return properties.map((property) => {
    const propertyListings = listingModels.filter(
      (listing) => listing.propertyId === property.id,
    );
    const primaryListing = propertyListings[0];
    const roomOffers = propertyListings.flatMap((listing) =>
      listing.roomOffers.map((roomOffer) => ({
        ...roomOffer,
        listingId: listing.id,
        listingName: listing.name,
        listingStatus: listing.status,
      })),
    );
    const pricingPeriods = new Set(
      roomOffers.map((offer) => `${offer.currency}:${offer.pricePeriod}`),
    );
    const startingOffer =
      pricingPeriods.size === 1
        ? roomOffers.reduce(
            (lowestOffer, offer) =>
              !lowestOffer || offer.price < lowestOffer.price ? offer : lowestOffer,
            null,
          )
        : null;
    const photos = property.mediaManaged
      ? property.media
        .slice()
        .sort((first, second) =>
          Number(second.isCover) - Number(first.isCover) || first.sortOrder - second.sortOrder)
        .map((photo) => ({ ...photo, isLocal: true }))
      : [...new Set(propertyListings.flatMap((listing) => listing.photos))];
    const locationParts = [property.area ?? primaryListing?.area, property.city ?? primaryListing?.city]
      .filter(Boolean);

    return {
      id: property.id,
      ownerId: property.ownerId,
      createdAt: property.createdAt ?? null,
      isDemo: Boolean(property.isDemo ?? !property.createdAt),
      name: property.name ?? primaryListing?.name ?? "Example property without a listing",
      location: locationParts.length
        ? locationParts.join(", ")
        : primaryListing?.location ?? "Location not provided",
      region: property.region ?? primaryListing?.region ?? "",
      city: property.city ?? primaryListing?.city ?? "",
      area: property.area ?? primaryListing?.area ?? "",
      address: property.address ?? "",
      institution: property.institution ?? primaryListing?.school ?? "",
      description: property.description ?? primaryListing?.description ?? "",
      type: property.type ?? primaryListing?.type ?? "Accommodation",
      photos,
      listings: propertyListings,
      listingCount: propertyListings.length,
      roomOffers,
      roomOfferCount: roomOffers.length,
      startingPrice: startingOffer?.price ?? null,
      startingPricePeriod: startingOffer?.pricePeriod ?? null,
      statuses: [...new Set(propertyListings.map((listing) => listing.status))],
    };
  });
}

/**
 * Build provider summary values and property-level records from demo data.
 *
 * @param {string} providerId Demo provider identifier.
 * @returns {object | null} Dashboard data, or null when the demo provider is unknown.
 */
export function getProviderDashboard(providerId) {
  const workspace = getDemoProviderWorkspace(providerId);

  if (!workspace) {
    return null;
  }

  const storedProperties = getStoredProviderProperties(providerId);
  const storedPropertiesById = new Map(
    storedProperties.map((property) => [property.id, property]),
  );
  const demoProperties = workspace.properties.map((property) => ({
    ...property,
    ...(storedPropertiesById.get(property.id) ?? {}),
    isDemo: true,
  }));
  const demoPropertyIds = new Set(demoProperties.map(({ id }) => id));
  const newProperties = storedProperties.filter(({ id }) => !demoPropertyIds.has(id));
  const providerListings = getProviderListings(providerId);
  const properties = buildProviderPropertyViewModels(
    [...demoProperties, ...newProperties],
    providerListings,
  );
  const listings = properties.flatMap((property) => property.listings);
  const enquiries = getProviderEnquiries(providerId);

  return {
    provider: workspace.provider,
    properties,
    summary: {
      totalProperties: properties.length,
      totalListings: listings.length,
      publishedListings: listings.filter(({ status }) => status === "published").length,
      draftListings: listings.filter(({ status }) => status === "draft").length,
      availableRoomOffers: listings.flatMap(({ roomOffers }) => roomOffers)
        .filter(({ availabilityStatus, quantity }) =>
          availabilityStatus === "available" && Number(quantity ?? 0) > 0).length,
      newEnquiries: enquiries.filter(({ status }) => status === "new").length,
      propertiesWithActiveListings: properties.filter((property) =>
        property.listings.some(({ status }) => status === "published"),
      ).length,
      propertiesWithDraftListings: properties.filter((property) =>
        property.listings.some(({ status }) => status === "draft"),
      ).length,
      activeListings: listings.filter(({ status }) => status === "published").length,
      pendingListings: listings.filter(({ status }) => status === "pending_approval").length,
      totalEnquiries: enquiries.length,
      recentActivity: [
        ...listings.map((listing) => ({
          id: `listing-${listing.id}`,
          label: `${listing.name} · ${listing.status}`,
          date: listing.lastUpdatedAt,
          type: "listing",
        })),
        ...enquiries.map((enquiry) => ({
          id: enquiry.id,
          label: `Enquiry from ${enquiry.name} · ${enquiry.listing.name}`,
          date: enquiry.createdAt,
          type: "enquiry",
        })),
      ].sort((first, second) =>
        Date.parse(second.date ?? 0) - Date.parse(first.date ?? 0)).slice(0, 5),
    },
  };
}

/**
 * Filter property summaries by display name and any associated listing status.
 *
 * @param {object[]} properties Property view models.
 * @param {{ query?: string, status?: string }} filters Active page filters.
 * @returns {object[]} Matching properties.
 */
export function filterProviderProperties(properties, { query = "", status = "" } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return properties.filter((property) => {
    const matchesName = property.name.toLocaleLowerCase().includes(normalizedQuery);
    const matchesStatus =
      !status || property.listings.some((listing) => listing.status === status);

    return matchesName && matchesStatus;
  });
}

/**
 * Find one property in a provider's demonstration workspace.
 *
 * @param {string} providerId Demo provider identifier.
 * @param {string} propertyId Physical property identifier.
 * @returns {object | null} Provider-owned demo property or null.
 */
export function getProviderPropertyById(providerId, propertyId) {
  const dashboard = getProviderDashboard(providerId);
  return dashboard?.properties.find((property) => property.id === propertyId) ?? null;
}

/** Create a provider-owned physical property without creating an advertisement. */
export async function createProviderProperty(providerId, values, images = []) {
  validatePropertyInput(values, images);
  return createProviderPropertyRecord(providerId, values, images);
}

/** Load the photos belonging to one browser-persisted physical property. */
export async function getProviderPropertyImages(providerId, propertyId) {
  const property = getStoredProviderProperty(providerId, propertyId);
  if (!property) return [];
  return getPropertyImages(property.media ?? []);
}

/** Update property fields and its selected photo set in browser-local storage. */
export async function updateProviderProperty(providerId, propertyId, values, images = []) {
  validatePropertyInput(values, images);
  const baseProperty = getProviderPropertyById(providerId, propertyId);
  if (!baseProperty) {
    throw new Error("This property could not be found in your provider workspace.");
  }
  return updateProviderPropertyRecord(providerId, propertyId, values, images, baseProperty);
}

function validatePropertyInput(values, images) {
  const fieldErrors = validatePropertyForm(values);
  if (Object.keys(fieldErrors).length > 0) {
    throw new Error("Complete the required property fields before saving.");
  }

  const imageError = images.map(({ file }) => getPropertyImageError(file)).find(Boolean);
  if (imageError) {
    throw new Error(imageError);
  }
}

/** Refuse deletion while any fixture listing is still attached to the property. */
export async function deleteProviderProperty(providerId, propertyId) {
  const listings = getProviderListings(providerId)
    .filter((listing) => listing.propertyId === propertyId);
  const roomOfferCount = listings.reduce(
    (count, listing) => count + listing.roomOffers.length,
    0,
  );
  if (listings.length > 0 || roomOfferCount > 0) {
    throw new Error(
      `This property cannot be deleted while ${listings.length} ${listings.length === 1 ? "listing is" : "listings are"} attached${roomOfferCount > 0 ? ` with ${roomOfferCount} room ${roomOfferCount === 1 ? "offer" : "offers"}` : ""}. Handle those records first; nothing was deleted.`,
    );
  }

  return deleteProviderPropertyRecord(providerId, propertyId);
}
