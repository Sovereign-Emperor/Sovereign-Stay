import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProviderWorkspaceRecords } = vi.hoisted(() => ({
  getProviderWorkspaceRecords: vi.fn(),
}));

vi.mock("../../data/supabaseProviderRepository", () => ({
  getProviderWorkspaceRecords,
  saveProviderProperty: vi.fn(),
  saveProviderListing: vi.fn(),
  submitProviderListingForReview: vi.fn(),
  archiveProviderListing: vi.fn(),
  uploadListingMedia: vi.fn(),
}));

import { ProviderBackendListingPreview } from "./ProviderBackendPages";

beforeEach(() => {
  vi.clearAllMocks();
  getProviderWorkspaceRecords.mockResolvedValue({
    listings: [{
      id: "listing-1",
      status: "draft",
      name: "Example listing",
      description: "Provider preview content.",
      location_summary: "Adweso",
      properties: { name: "Example property" },
      listing_rooms: [
        { id: "active-room", is_active: true, label: "Active room", price_amount: 1000, pricing_period: "month" },
        { id: "retired-room", is_active: false, label: "Retired room", price_amount: 900, pricing_period: "month" },
      ],
    }],
  });
});

describe("ProviderBackendListingPreview", () => {
  it("shows active room offers without presenting retired offers as current", async () => {
    render(
      <MemoryRouter initialEntries={["/provider/listings/listing-1"]}>
        <Routes>
          <Route path="/provider/listings/:listingId" element={<ProviderBackendListingPreview />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Active room")).toBeInTheDocument();
    expect(screen.queryByText("Retired room")).not.toBeInTheDocument();
  });
});
