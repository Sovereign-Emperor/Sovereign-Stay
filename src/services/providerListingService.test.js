import { afterEach, describe, expect, it } from "vitest";
import {
  getMarketplaceListings,
  getProviderListingById,
  getProviderListings,
  deleteProviderListing,
  saveProviderListing,
  updateProviderListingStatus,
  validateListingValues,
} from "./providerListingService";
import { submitListingEnquiry } from "./enquiryService";
import {
  createProviderProperty,
  deleteProviderProperty,
  getProviderDashboard,
} from "./providerDashboardService";

const providerId = "demo-provider-a";
const values = {
  name: "Adweso study rooms",
  propertyId: "property-greenview",
  description: "A local demonstration listing with clear room pricing.",
  propertyType: "Hostel",
  locationSummary: "Poly Junction, Koforidua",
  institution: "Koforidua Technical University",
  availableFrom: "",
  availabilityStatus: "unknown",
  facilityNames: ["Wi-Fi"],
  utilities: "Water",
  houseRules: "Quiet hours after 10 pm",
  depositRequirements: "",
  contactPreference: "enquiry",
  viewingPreference: "",
};
const offer = {
  roomType: "Single room",
  description: "A private room.",
  occupancy: "1",
  quantity: "2",
  price: "1450",
  period: "semester",
  deposit: "",
  availabilityStatus: "unknown",
  features: "Furnished",
};

afterEach(() => localStorage.clear());

describe("providerListingService", () => {
  it("creates distinct listings for an owned property with normalized room offers", () => {
    const first = saveProviderListing(providerId, null, values, [offer]);
    const second = saveProviderListing(providerId, null, { ...values, name: "Another advertisement" }, [offer]);

    expect(first.id).toMatch(/^listing-local-/);
    expect(second.id).not.toBe(first.id);
    expect(first).toMatchObject({
      ownerId: providerId,
      propertyId: values.propertyId,
      propertyName: expect.any(String),
      status: "draft",
      photos: expect.arrayContaining([expect.any(String)]),
      roomOffers: [{ roomType: "Single room", price: 1450, currency: "GHS", period: "semester" }],
    });
    expect(getProviderListings(providerId).filter(({ propertyId }) => propertyId === values.propertyId))
      .toHaveLength(3);
  });

  it("rejects foreign property relationships and invalid listing fields", () => {
    expect(() => saveProviderListing(providerId, null, {
      ...values,
      propertyId: "property-owned-by-provider-b",
    }, [offer])).toThrow(/owned by this provider/);
    expect(validateListingValues({ ...values, name: " " }, [
      { ...offer, price: "-1" },
    ])).toMatchObject({
      name: expect.any(String),
      roomOffers: expect.arrayContaining([expect.stringContaining("price must be greater than zero")]),
    });
    expect(validateListingValues(values, [{ ...offer, quantity: "" }]).roomOffers)
      .toContain("Room offer 1: room quantity must be zero or more.");
  });

  it("updates listing and room data, and changes only the listing lifecycle", () => {
    const created = saveProviderListing(providerId, null, values, [offer]);
    const edited = saveProviderListing(
      providerId,
      created.id,
      { ...values, name: "Revised headline" },
      [{ ...offer, price: "1600" }],
    );
    expect(edited.name).toBe("Revised headline");
    expect(edited.roomOffers[0].price).toBe(1600);

    const published = updateProviderListingStatus(providerId, created.id, "published");
    expect(published.status).toBe("published");
    expect(getMarketplaceListings().find(({ id }) => id === created.id)).toMatchObject({
      id: created.id,
      status: "published",
      name: "Revised headline",
      price: 1600,
    });
    expect(getProviderDashboard(providerId).summary.publishedListings).toBe(4);
    expect(updateProviderListingStatus(providerId, created.id, "archived").status).toBe("archived");
    expect(getMarketplaceListings().some(({ id }) => id === created.id)).toBe(false);
    expect(updateProviderListingStatus(providerId, created.id, "draft").status).toBe("draft");
  });

  it("keeps a valid draft out of student search until locally published", () => {
    const draft = saveProviderListing(providerId, null, values, [offer]);
    expect(getProviderListingById(providerId, draft.id).status).toBe("draft");
    expect(getMarketplaceListings().some(({ id }) => id === draft.id)).toBe(false);
    expect(getMarketplaceListings().every(({ status }) => status === "published")).toBe(true);
  });

  it("requires a room offer before publishing and allows saving the draft", () => {
    const draft = saveProviderListing(providerId, null, values, []);
    expect(draft.roomOffers).toEqual([]);
    expect(() => updateProviderListingStatus(providerId, draft.id, "published"))
      .toThrow(/at least one room offer/);
  });

  it("allows room-offer removal and rejects negative pricing and quantities", () => {
    const created = saveProviderListing(providerId, null, values, [offer]);
    const updated = saveProviderListing(providerId, created.id, values, []);
    expect(updated.roomOffers).toEqual([]);
    expect(() => saveProviderListing(providerId, created.id, values, [
      { ...offer, price: "-10", quantity: "-1" },
    ])).toThrow(/price must be greater than zero/);
  });

  it("preserves listing and room offers when an enquiry depends on the listing", () => {
    const listing = saveProviderListing(providerId, null, values, [offer]);
    updateProviderListingStatus(providerId, listing.id, "published");
    submitListingEnquiry(listing.id, {
      name: "Demo student",
      email: "student@example.test",
      phone: "0200000000",
      message: "I would like to ask about this example listing.",
      viewingDate: "",
    });

    expect(() => deleteProviderListing(providerId, listing.id))
      .toThrow(/has enquiries and cannot be deleted/);
    expect(getProviderListingById(providerId, listing.id)).toMatchObject({
      id: listing.id,
      roomOffers: [{ roomType: "Single room" }],
    });
  });

  it("prevents deleting a property after a listing is attached", async () => {
    const property = await createProviderProperty(providerId, {
      name: "Listing dependency property",
      type: "Apartment",
      description: "",
      region: "Eastern",
      city: "Koforidua",
      area: "Adweso",
      address: "",
      institution: "",
    });
    saveProviderListing(providerId, null, {
      ...values,
      propertyId: property.id,
    }, [offer]);

    await expect(deleteProviderProperty(providerId, property.id))
      .rejects.toThrow(/1 listing is attached/);
  });
});
