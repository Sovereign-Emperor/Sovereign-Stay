import {
  findDemoListingById,
  getDemoListingFilterOptions,
  searchDemoListings,
} from "../data/demoListingRepository";
import {
  getSupabaseListingById,
  getSupabaseListingFilterOptions,
  searchSupabaseListings,
} from "../data/supabaseListingRepository";
import { isExplicitSupabaseMode } from "../data/supabaseClient";

const MAX_PAGE_SIZE = 50;

/**
 * Search accommodation using a query contract that supports server-side
 * filtering, sorting, and pagination when the demo repository is replaced.
 *
 * @param {{
 *   filters?: {
 *     query?: string,
 *     school?: string,
 *     area?: string,
 *     roomType?: string,
 *     minPrice?: string | number,
 *     maxPrice?: string | number,
 *     facility?: string
 *   },
 *   sortBy?: "recommended" | "price-low" | "price-high" | "nearest",
 *   page?: number,
 *   pageSize?: number
 * }} [query]
 */
export async function searchListings({
  filters = {},
  sortBy = "recommended",
  page = 1,
  pageSize = 12,
} = {}) {
  if (!Number.isInteger(page) || page < 1) {
    throw new RangeError("Listing page must be a positive whole number.");
  }

  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
    throw new RangeError(`Listing page size must be between 1 and ${MAX_PAGE_SIZE}.`);
  }

  const result = isExplicitSupabaseMode
    ? await searchSupabaseListings({ filters, sortBy, page, pageSize })
    : await searchDemoListings({ filters, sortBy, page, pageSize });
  return {
    items: result.items,
    total: result.total,
    page,
    pageSize,
    hasNextPage: page * pageSize < result.total,
  };
}

/** Load the page-ready record for an individual listing route. */
export async function getListingById(id) {
  if (isExplicitSupabaseMode) return getSupabaseListingById(id);
  const listing = await findDemoListingById(id);
  return listing ?? null;
}

/** Load the values used to populate the discovery filters. */
export async function getListingFilterOptions() {
  if (isExplicitSupabaseMode) return getSupabaseListingFilterOptions();
  return getDemoListingFilterOptions();
}
