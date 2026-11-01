import { demoListings, facilities } from "./properties";
import { filterProperties } from "../utils/propertyFilters";
import { toListingViewModel } from "../utils/listingViewModel";

/**
 * In-memory repository adapter for the MVP's demonstration fixtures.
 *
 * The repository contract accepts filters and pagination so a future API
 * adapter can pass these values to indexed database queries instead of
 * downloading every listing. Only this demo adapter filters its full local set.
 */
export async function searchDemoListings({ filters, sortBy, page, pageSize }) {
  const allViewModels = demoListings.map(toListingViewModel);
  const matchingViewModels = filterProperties(allViewModels, filters);

  if (sortBy === "price-low") {
    matchingViewModels.sort((first, second) => first.price - second.price);
  } else if (sortBy === "price-high") {
    matchingViewModels.sort((first, second) => second.price - first.price);
  } else if (sortBy === "nearest") {
    matchingViewModels.sort((first, second) => first.distanceKm - second.distanceKm);
  }

  const total = matchingViewModels.length;
  const firstItemIndex = (page - 1) * pageSize;
  const listingsById = new Map(demoListings.map((listing) => [listing.id, listing]));
  const items = matchingViewModels
    .slice(firstItemIndex, firstItemIndex + pageSize)
    .map(({ id }) => listingsById.get(id));

  return {
    items,
    total,
  };
}

/** Find one canonical fixture for the listing detail route. */
export async function findDemoListingById(id) {
  return demoListings.find((listing) => listing.id === id) ?? null;
}

/** Return the available demonstration filter choices. */
export async function getDemoListingFilterOptions() {
  const listings = demoListings.map(toListingViewModel);

  return {
    totalListings: listings.length,
    schools: [...new Set(listings.map(({ school }) => school))],
    areas: [...new Set(listings.map(({ area }) => area))],
    roomTypes: [...new Set(listings.map(({ roomType }) => roomType))],
    facilities: facilities.map(({ label }) => label),
  };
}
