import { getDemoProviderWorkspace } from "../data/demoProviderRepository";
import { toListingViewModel } from "../utils/listingViewModel";

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
  const listingModels = listings.map(toListingViewModel);

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
    const photos = [...new Set(propertyListings.flatMap((listing) => listing.photos))];

    return {
      id: property.id,
      ownerId: property.ownerId,
      name: primaryListing?.name ?? "Example property without a listing",
      location: primaryListing?.location ?? "Location not provided",
      type: primaryListing?.type ?? "Accommodation",
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

  const properties = buildProviderPropertyViewModels(
    workspace.properties,
    workspace.listings,
  );
  const listings = properties.flatMap((property) => property.listings);

  return {
    provider: workspace.provider,
    properties,
    summary: {
      totalProperties: properties.length,
      propertiesWithActiveListings: properties.filter((property) =>
        property.listings.some(({ status }) => status === "published"),
      ).length,
      propertiesWithDraftListings: properties.filter((property) =>
        property.listings.some(({ status }) => status === "draft"),
      ).length,
      activeListings: listings.filter(({ status }) => status === "published").length,
      pendingListings: listings.filter(({ status }) => status === "pending_approval").length,
      totalEnquiries: workspace.enquiries.length,
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
