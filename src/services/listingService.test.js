import { afterEach, describe, expect, it } from "vitest";
import {
  demoListings,
  demoUsers,
  listingMediaKinds,
  listingStatuses,
  userRoles,
} from "../data/properties";
import { demoProperties } from "../data/demoProperties";
import { getListingById, getListingFilterOptions, searchListings } from "./listingService";
import { saveProviderListing, updateProviderListingStatus } from "./providerListingService";

describe("listing service", () => {
  afterEach(() => localStorage.clear());

  it("adapts related demo records to the current discovery view model", async () => {
    const listing = await getListingById("greenview-residences");

    expect(listing).toMatchObject({
      id: "greenview-residences",
      ownerId: "demo-provider-a",
      providerVerificationStatus: "unverified",
      propertyVerificationStatus: "unverified",
      availabilityStatus: "unknown",
      lastUpdatedAt: null,
      roomType: "2 in a room",
      school: "Koforidua Technical University",
      facilities: expect.arrayContaining(["Wi-Fi", "Water"]),
    });
    expect(listing.photos).toHaveLength(4);
  });

  it("returns null for an unknown listing id", async () => {
    await expect(getListingById("not-a-listing")).resolves.toBeNull();
  });

  it("applies combined search filters before calculating the result page", async () => {
    const result = await searchListings({
      filters: {
        area: "Poly Junction",
        roomType: "2 in a room",
        minPrice: "2000",
        maxPrice: "3000",
        facility: "Wi-Fi",
      },
    });

    expect(result.total).toBe(1);
    expect(result.items.map(({ id }) => id)).toEqual(["greenview-residences"]);
  });

  it("omits missing values from filter options and sorts unknown distances last", async () => {
    const localListing = saveProviderListing("demo-provider-a", null, {
      name: "Local filter option listing",
      propertyId: "property-greenview",
      description: "Local demo listing for filter option validation.",
      propertyType: "Hostel",
      locationSummary: "Adweso, Koforidua",
      institution: "Koforidua Technical University",
      availabilityStatus: "unknown",
      facilityNames: [],
    }, [{
      roomType: "Single room",
      occupancy: "1",
      quantity: "1",
      price: "900",
      period: "semester",
      deposit: "",
      availabilityStatus: "unknown",
    }]);
    updateProviderListingStatus("demo-provider-a", localListing.id, "published");

    const options = await getListingFilterOptions();
    const nearest = await searchListings({ sortBy: "nearest", pageSize: 50 });
    const optionLists = [
      options.schools,
      options.areas,
      options.roomTypes,
      options.propertyTypes,
      options.availabilityStatuses,
      options.facilities,
    ];

    expect(optionLists.every((list) =>
      list.every((value) => typeof value === "string" && value.trim()) &&
      new Set(list).size === list.length,
    )).toBe(true);
    expect(options.areas).toContain("Adweso, Koforidua");
    expect(nearest.items.at(-1).id).toBe(localListing.id);
  });

  it("paginates without repeating records and keeps the total matching count", async () => {
    const firstPage = await searchListings({ page: 1, pageSize: 2, sortBy: "price-low" });
    const secondPage = await searchListings({ page: 2, pageSize: 2, sortBy: "price-low" });

    expect(firstPage.total).toBe(demoListings.length);
    expect(firstPage.items.map(({ id }) => id)).toEqual([
      "cedar-student-homes",
      "hilltop-court",
    ]);
    expect(firstPage.hasNextPage).toBe(true);
    expect(secondPage.items.map(({ id }) => id)).toEqual([
      "sunrise-hostel",
      "greenview-residences",
    ]);
    expect(new Set([...firstPage.items, ...secondPage.items].map(({ id }) => id)).size).toBe(4);
  });

  it("keeps every listing linked to a provider user with the provider role", () => {
    const providerIds = new Set(
      demoUsers.filter((user) => user.roleIds.includes("provider")).map(({ id }) => id),
    );
    const propertiesById = new Map(demoProperties.map((property) => [property.id, property]));

    expect(listingStatuses).toEqual([
      "draft",
      "pending_approval",
      "published",
      "rejected",
      "archived",
    ]);
    expect(listingMediaKinds).toEqual(["photo", "video"]);
    expect(userRoles.map(({ id }) => id)).toEqual(["student", "provider", "administrator"]);
    expect(
      demoListings.every((listing) => {
        const property = propertiesById.get(listing.propertyId);
        return property && providerIds.has(property.ownerId);
      }),
    ).toBe(true);
    expect(demoListings.every((listing) => listing.status === "published" && listing.isDemo)).toBe(true);
    expect(demoListings.every((listing) => listing.media.length >= 2)).toBe(true);
    expect(
      demoListings.some((listing) => listing.media.some(({ kind }) => kind === "video")),
    ).toBe(false);
    expect(
      demoListings.filter(
        (listing) => propertiesById.get(listing.propertyId).ownerId === "demo-provider-a",
      ),
    ).toHaveLength(3);
    expect(demoUsers.filter((user) => providerIds.has(user.id))).toHaveLength(2);
  });

  it("rejects invalid pagination instead of silently returning misleading pages", async () => {
    await expect(searchListings({ page: 0 })).rejects.toThrow(/positive whole number/i);
    await expect(searchListings({ pageSize: 100 })).rejects.toThrow(/between 1 and 50/i);
  });
});
