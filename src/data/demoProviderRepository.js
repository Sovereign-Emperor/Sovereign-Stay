import { demoUsers } from "./properties";
import { getDemoListingsForProperty, getDemoPropertiesForProvider } from "./demoPropertyRepository";

export const DEMO_PROVIDER_ID = "demo-provider-a";

// These fictional records exist only to make dashboard summary counts useful.
const demoEnquiries = [
  { id: "demo-enquiry-1", listingId: "greenview-residences" },
  { id: "demo-enquiry-2", listingId: "greenview-residences" },
  { id: "demo-enquiry-3", listingId: "greenview-residences" },
  { id: "demo-enquiry-4", listingId: "hilltop-court" },
  { id: "demo-enquiry-5", listingId: "hilltop-court" },
  { id: "demo-enquiry-6", listingId: "sunrise-hostel" },
];

/**
 * Read the example provider and only the demonstration listings and enquiries
 * connected to that provider. This module is a local fixture boundary, not
 * authentication or an authorization check.
 *
 * @param {string} providerId Demo provider identifier.
 * @returns {{ provider: object, listings: object[], enquiries: object[] } | null}
 */
export function getDemoProviderWorkspace(providerId) {
  const provider = demoUsers.find((user) => user.id === providerId);

  if (!provider || !provider.isDemo) {
    return null;
  }

  const properties = getDemoPropertiesForProvider(providerId);
  const listings = properties.flatMap(({ id }) => getDemoListingsForProperty(id));
  const listingIds = new Set(listings.map((listing) => listing.id));
  const enquiries = demoEnquiries.filter((enquiry) => listingIds.has(enquiry.listingId));

  return { provider, properties, listings, enquiries };
}
