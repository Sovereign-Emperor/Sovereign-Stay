import { afterEach, describe, expect, it } from "vitest";
import {
  getProviderEnquiries,
  getProviderEnquiry,
  submitListingEnquiry,
  updateProviderEnquiryStatus,
  validateEnquiry,
} from "./enquiryService";
import {
  saveProviderListing,
  updateProviderListingStatus,
} from "./providerListingService";

const providerId = "demo-provider-a";
const offer = {
  roomType: "Single room",
  description: "",
  occupancy: "1",
  quantity: "1",
  price: "1500",
  period: "semester",
  deposit: "",
  availabilityStatus: "unknown",
  features: "",
};
const values = {
  name: "Example student",
  email: "student@example.test",
  phone: "+233 20 123 4567",
  message: "I would like to ask about the room.",
  viewingDate: "",
};

afterEach(() => localStorage.clear());

describe("local enquiry workflow", () => {
  it("validates required student contact details and message", () => {
    expect(validateEnquiry({ ...values, email: "not-an-email", phone: "" })).toMatchObject({
      email: expect.stringContaining("valid email"),
      phone: expect.stringContaining("valid phone"),
    });
    expect(validateEnquiry({ ...values, message: "   " }).message)
      .toContain("Add a message");
  });

  it("persists enquiries against the correct published listing and property", () => {
    const listing = saveProviderListing(providerId, null, {
      name: "Enquiry test listing",
      propertyId: "property-greenview",
      description: "Local demo listing.",
      propertyType: "Hostel",
      locationSummary: "Koforidua",
      institution: "KTU",
      availabilityStatus: "unknown",
      facilityNames: [],
      utilities: "",
      houseRules: "",
      depositRequirements: "",
      contactPreference: "enquiry",
      viewingPreference: "",
      availableFrom: "",
    }, [offer]);
    const published = updateProviderListingStatus(providerId, listing.id, "published");
    const result = submitListingEnquiry(published.id, values);
    const duplicate = submitListingEnquiry(published.id, values);

    expect(result.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(result.enquiry).toMatchObject({
      listingId: published.id,
      propertyId: "property-greenview",
      providerId,
      status: "new",
      email: values.email,
    });
    expect(getProviderEnquiries(providerId)).toHaveLength(1);
    expect(getProviderEnquiries("demo-provider-b")).toHaveLength(0);
    expect(getProviderEnquiry(providerId, result.enquiry.id).listing.id).toBe(published.id);
    expect(() => updateProviderEnquiryStatus("demo-provider-b", result.enquiry.id, "closed"))
      .toThrow(/could not be found/);
    expect(updateProviderEnquiryStatus(providerId, result.enquiry.id, "in_progress").status)
      .toBe("in_progress");
  });

  it("rejects enquiries for drafts and prevents duplicate accidental submissions", () => {
    const listing = saveProviderListing(providerId, null, {
      name: "Draft enquiry fixture",
      propertyId: "property-greenview",
      description: "Local demo listing.",
      propertyType: "Hostel",
      locationSummary: "Koforidua",
      institution: "KTU",
      availabilityStatus: "unknown",
      facilityNames: [],
      utilities: "",
      houseRules: "",
      depositRequirements: "",
      contactPreference: "enquiry",
      viewingPreference: "",
      availableFrom: "",
    }, [offer]);
    expect(() => submitListingEnquiry(listing.id, values)).toThrow(/no longer accepting enquiries/);
  });
});
