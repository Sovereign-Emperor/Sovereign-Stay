import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  getListingById: vi.fn(),
  getListingFilterOptions: vi.fn(),
  searchListings: vi.fn(),
}));

vi.mock("../services/listingService", () => service);

import { useListingById, useListingFilterOptions, useListingSearch } from "./useListings";

const filters = {};

describe("listing loading retries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("retries discovery after a service error", async () => {
    service.searchListings
      .mockRejectedValueOnce(new Error("Service unavailable"))
      .mockResolvedValue({ items: [{ id: "listing-1" }], total: 1, page: 1, hasNextPage: false });

    const { result } = renderHook(() => useListingSearch(filters, "recommended"));
    await waitFor(() => expect(result.current.error.message).toBe("Service unavailable"));

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.items).toEqual([{ id: "listing-1" }]));
    expect(service.searchListings).toHaveBeenCalledTimes(2);
  });

  it("retries filter options and individual listing details", async () => {
    service.getListingFilterOptions
      .mockRejectedValueOnce(new Error("Options unavailable"))
      .mockResolvedValue({ totalListings: 1, schools: ["KTU"] });
    service.getListingById
      .mockRejectedValueOnce(new Error("Listing unavailable"))
      .mockResolvedValue({ id: "listing-1", name: "Example listing" });

    const filtersHook = renderHook(() => useListingFilterOptions());
    const detailHook = renderHook(() => useListingById("listing-1"));

    await waitFor(() => expect(filtersHook.result.current.error.message).toBe("Options unavailable"));
    await waitFor(() => expect(detailHook.result.current.error.message).toBe("Listing unavailable"));

    act(() => {
      filtersHook.result.current.retry();
      detailHook.result.current.retry();
    });

    await waitFor(() => expect(filtersHook.result.current.options.schools).toEqual(["KTU"]));
    await waitFor(() => expect(detailHook.result.current.listing.name).toBe("Example listing"));
    expect(service.getListingFilterOptions).toHaveBeenCalledTimes(2);
    expect(service.getListingById).toHaveBeenCalledTimes(2);
  });
});
