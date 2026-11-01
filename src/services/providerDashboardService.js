import { getDemoProviderWorkspace } from "../data/demoProviderRepository";
import { toListingViewModel } from "../utils/listingViewModel";

/**
 * Assemble summary values and card-ready records for the demo provider pages.
 *
 * @param {string} providerId Demo provider identifier.
 * @returns {object | null} Dashboard data, or null when the demo provider is unknown.
 */
export function getProviderDashboard(providerId) {
  const workspace = getDemoProviderWorkspace(providerId);

  if (!workspace) {
    return null;
  }

  const properties = workspace.listings.map((listing) => {
    const viewModel = toListingViewModel(listing);
    const startingRoom = listing.rooms.reduce((lowestPriceRoom, room) =>
      room.price.amount < lowestPriceRoom.price.amount ? room : lowestPriceRoom,
    );

    return {
      ...viewModel,
      roomOfferCount: listing.rooms.length,
      startingPrice: startingRoom.price.amount,
      startingPricePeriod: startingRoom.price.period,
    };
  });

  return {
    provider: workspace.provider,
    properties,
    summary: {
      totalProperties: properties.length,
      activeListings: properties.filter(({ status }) => status === "published").length,
      pendingListings: properties.filter(({ status }) => status === "pending_approval").length,
      totalEnquiries: workspace.enquiries.length,
    },
  };
}
