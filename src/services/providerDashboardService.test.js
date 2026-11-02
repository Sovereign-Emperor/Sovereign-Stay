import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProviderProperty,
  deleteProviderProperty,
  filterProviderProperties,
  getProviderDashboard,
  getProviderPropertyById,
  updateProviderProperty,
} from "./providerDashboardService";

const providerId = "demo-provider-a";
const values = {
  name: "New local residence",
  type: "Apartment",
  description: "A browser-local example property.",
  region: "Eastern",
  city: "Koforidua",
  area: "Adweso",
  address: "",
  institution: "",
};

afterEach(() => {
  localStorage.removeItem("sovereign-stay:provider-properties:v1");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("providerDashboardService local property workflow", () => {
  it("integrates created properties into dashboard counts, search, filters, and details", async () => {
    const property = await createProviderProperty(providerId, values);
    const dashboard = getProviderDashboard(providerId);

    expect(dashboard.summary.totalProperties).toBe(4);
    expect(dashboard.properties.find(({ id }) => id === property.id)).toMatchObject({
      name: "New local residence",
      type: "Apartment",
      location: "Adweso, Koforidua",
      listingCount: 0,
      roomOfferCount: 0,
      startingPrice: null,
      photos: [],
    });
    expect(filterProviderProperties(dashboard.properties, { query: "new local" }))
      .toHaveLength(1);
    expect(filterProviderProperties(dashboard.properties, { status: "published" }))
      .toHaveLength(3);
    expect(getProviderPropertyById(providerId, property.id).region).toBe("Eastern");
    expect(dashboard.summary.activeListings).toBe(3);
    expect(dashboard.summary.totalEnquiries).toBe(0);
  });

  it("validates fields and images before writing any property record", async () => {
    await expect(createProviderProperty(providerId, { ...values, city: " " }))
      .rejects.toThrow("Complete the required property fields");
    const invalidFile = new File(["not an image"], "floorplan.gif", { type: "image/gif" });
    await expect(createProviderProperty(providerId, values, [{ file: invalidFile }]))
      .rejects.toThrow("choose a JPG, JPEG, PNG, or WebP");
    expect(getProviderDashboard(providerId).summary.totalProperties).toBe(3);
  });

  it("reports unavailable IndexedDB when an image cannot be persisted", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const photo = new File(["photo"], "bedroom.jpg", { type: "image/jpeg" });

    await expect(createProviderProperty(providerId, values, [{ file: photo }]))
      .rejects.toThrow("does not support local image storage");
    expect(getProviderDashboard(providerId).summary.totalProperties).toBe(3);
  });

  it("saves edits and removes unlinked properties without changing fixture listings", async () => {
    const created = await createProviderProperty(providerId, values);
    const updated = await updateProviderProperty(
      providerId,
      created.id,
      { ...values, name: "Updated local residence" },
    );
    expect(updated.property.name).toBe("Updated local residence");
    expect(getProviderPropertyById(providerId, created.id).name).toBe("Updated local residence");

    await deleteProviderProperty(providerId, created.id);
    expect(getProviderPropertyById(providerId, created.id)).toBeNull();
    expect(getProviderDashboard(providerId).summary.totalProperties).toBe(3);
  });

  it("blocks deletion of a property with listings and room offers", async () => {
    await expect(
      deleteProviderProperty(providerId, "property-greenview"),
    ).rejects.toThrow(/1 listing is attached with 1 room offer/);
    expect(getProviderPropertyById(providerId, "property-greenview")).not.toBeNull();
  });
});
