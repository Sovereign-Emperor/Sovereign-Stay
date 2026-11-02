import { useCallback, useEffect, useRef, useState } from "react";
import {
  getListingById,
  getListingFilterOptions,
  searchListings,
} from "../services/listingService";
import { validatePriceRange } from "../utils/propertyFilters";

const PAGE_SIZE = 12;

/**
 * Load listing pages through the service layer, ignoring responses from an
 * earlier search if the user changes filters before that request completes.
 */
export function useListingSearch(filters, sortBy) {
  const [results, setResults] = useState({
    items: [],
    total: 0,
    page: 1,
    hasNextPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const requestVersion = useRef(0);
  const priceError = validatePriceRange(filters);

  useEffect(() => {
    const version = requestVersion.current + 1;
    requestVersion.current = version;
    let active = true;

    setResults({ items: [], total: 0, page: 1, hasNextPage: false });
    setError(null);
    setIsLoading(true);
    setIsLoadingMore(false);

    if (priceError) {
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    searchListings({ filters, sortBy, page: 1, pageSize: PAGE_SIZE })
      .then((nextResults) => {
        if (active && requestVersion.current === version) {
          setResults(nextResults);
        }
      })
      .catch((cause) => {
        if (active && requestVersion.current === version) {
          setError(cause);
        }
      })
      .finally(() => {
        if (active && requestVersion.current === version) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [filters, priceError, sortBy]);

  const loadMore = useCallback(async () => {
    if (isLoading || isLoadingMore || !results.hasNextPage) {
      return;
    }

    const version = requestVersion.current;
    const nextPage = results.page + 1;
    setIsLoadingMore(true);
    setError(null);

    try {
      const nextResults = await searchListings({
        filters,
        sortBy,
        page: nextPage,
        pageSize: PAGE_SIZE,
      });

      if (requestVersion.current === version) {
        setResults((current) => ({
          ...nextResults,
          items: [...current.items, ...nextResults.items],
        }));
      }
    } catch (cause) {
      if (requestVersion.current === version) {
        setError(cause);
      }
    } finally {
      if (requestVersion.current === version) {
        setIsLoadingMore(false);
      }
    }
  }, [filters, isLoading, isLoadingMore, results, sortBy]);

  return { ...results, isLoading, isLoadingMore, error, loadMore };
}

/** Load discovery filter values independently from the page's visual controls. */
export function useListingFilterOptions() {
  const [options, setOptions] = useState({
    totalListings: null,
    schools: [],
    areas: [],
    roomTypes: [],
    propertyTypes: [],
    availabilityStatuses: [],
    facilities: [],
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    getListingFilterOptions()
      .then((nextOptions) => {
        if (active) setOptions(nextOptions);
      })
      .catch((cause) => {
        if (active) setError(cause);
      });

    return () => {
      active = false;
    };
  }, []);

  return { options, error };
}

/** Load an individual listing while the detail route is active. */
export function useListingById(id) {
  const [request, setRequest] = useState({
    id: null,
    listing: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    setRequest({ id, listing: null, isLoading: true, error: null });

    getListingById(id)
      .then((nextListing) => {
        if (active) setRequest({ id, listing: nextListing, isLoading: false, error: null });
      })
      .catch((cause) => {
        if (active) setRequest({ id, listing: null, isLoading: false, error: cause });
      });

    return () => {
      active = false;
    };
  }, [id]);

  if (request.id !== id) {
    return { listing: null, isLoading: true, error: null };
  }

  return request;
}
