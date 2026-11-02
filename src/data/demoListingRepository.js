import { facilities } from "./properties";
import { filterProperties } from "../utils/propertyFilters";
import { getMarketplaceListings } from "../services/providerListingService";

/**
 * In-memory repository adapter for the MVP's demonstration fixtures.
 *
 * The repository contract accepts filters and pagination so a future API
 * adapter can pass these values to indexed database queries instead of
 * downloading every listing. Only this demo adapter filters its full local set.
 */
export async function searchDemoListings({ filters, sortBy, page, pageSize }) {
  const allViewModels = getMarketplaceListings();
  const matchingViewModels = filterProperties(allViewModels, filters);

  if (sortBy === "price-low") {
    matchingViewModels.sort((first, second) => (first.price ?? Infinity) - (second.price ?? Infinity));
  } else if (sortBy === "price-high") {
    matchingViewModels.sort((first, second) => (second.price ?? -Infinity) - (first.price ?? -Infinity));
  } else if (sortBy === "nearest") {
    const distance = (listing) => Number.isFinite(listing.distanceKm)
      ? listing.distanceKm
      : Infinity;
    matchingViewModels.sort((first, second) => distance(first) - distance(second));
  }

  const total = matchingViewModels.length;
  const firstItemIndex = (page - 1) * pageSize;
  const items = matchingViewModels
    .slice(firstItemIndex, firstItemIndex + pageSize);

  return {
    items,
    total,
  };
}

/** Find one canonical fixture for the listing detail route. */
export async function findDemoListingById(id) {
  return getMarketplaceListings().find((listing) => listing.id === id) ?? null;
}

/** Return the available demonstration filter choices. */
export async function getDemoListingFilterOptions() {
  const listings = getMarketplaceListings();
  const uniqueOptions = (values) => [...new Set(
    values
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean),
  )];

  return {
    totalListings: listings.length,
    schools: uniqueOptions(listings.map(({ school }) => school)),
    areas: uniqueOptions(listings.map(({ area }) => area)),
    roomTypes: uniqueOptions(listings.map(({ roomType }) => roomType)),
    propertyTypes: uniqueOptions(listings.map(({ type }) => type)),
    availabilityStatuses: uniqueOptions(listings.map(({ availabilityStatus }) => availabilityStatus)),
    facilities: uniqueOptions(facilities.map(({ label }) => label)),
  };
}
