import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getProviderWorkspaceRecords, processPendingListingMedia, requestProviderListingEdit } = vi.hoisted(() => ({
  getProviderWorkspaceRecords: vi.fn(),
  processPendingListingMedia: vi.fn(),
  requestProviderListingEdit: vi.fn(),
}));

vi.mock("../../data/supabaseProviderRepository", () => ({
  getProviderWorkspaceRecords,
  processPendingListingMedia,
  requestProviderListingEdit,
  saveProviderProperty: vi.fn(),
  saveProviderListing: vi.fn(),
  submitProviderListingForReview: vi.fn(),
  archiveProviderListing: vi.fn(),
  uploadListingMedia: vi.fn(),
}));

import { ProviderBackendListingPreview, ProviderBackendListings } from "./ProviderBackendPages";

beforeEach(() => {
  vi.clearAllMocks();
  getProviderWorkspaceRecords.mockResolvedValue({
    workspaces: [],
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

describe("ProviderBackendListings", () => {
  it("offers a retry action for pending photos on existing listings", async () => {
    processPendingListingMedia.mockResolvedValue(1);
    getProviderWorkspaceRecords.mockResolvedValue({
      workspaces: [{ id: "business-1", role: "owner" }],
      listings: [{
        id: "listing-1",
        status: "published",
        name: "Example listing",
        updated_at: "2026-01-01T00:00:00.000Z",
        properties: { provider_business_id: "business-1", name: "Example property" },
        listing_media: [{ id: "media-1", processing_status: "pending" }],
      }],
    });

    render(
      <MemoryRouter>
        <ProviderBackendListings />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Process 1 pending photo" }));
    await waitFor(() => expect(processPendingListingMedia).toHaveBeenCalledWith("listing-1"));
  });

  it("requires confirmation and requests re-review before editing a published listing", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    requestProviderListingEdit.mockResolvedValue(undefined);
    getProviderWorkspaceRecords.mockResolvedValue({
      workspaces: [{ id: "business-1", role: "owner" }],
      listings: [{
        id: "listing-1",
        status: "published",
        name: "Example listing",
        updated_at: "2026-01-01T00:00:00.000Z",
        properties: { provider_business_id: "business-1", name: "Example property" },
      }],
    });

    render(
      <MemoryRouter initialEntries={["/provider/listings"]}>
        <Routes>
          <Route path="/provider/listings" element={<ProviderBackendListings />} />
          <Route path="/provider/listings/:listingId/edit" element={<p>Listing editor</p>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Edit listing and photos" }));

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("hidden from students"));
    await waitFor(() => expect(requestProviderListingEdit).toHaveBeenCalledWith("listing-1"));
    expect(await screen.findByText("Listing editor")).toBeInTheDocument();
    confirm.mockRestore();
  });
});
