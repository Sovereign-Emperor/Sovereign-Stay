import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseClient } = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({ getSupabaseClient }));

import {
  getProviderWorkspaceRecords,
  saveProviderListing,
  uploadListingMedia,
} from "./supabaseProviderRepository";

function queryResult(data, onSelect = () => {}) {
  const query = {
    select: (columns) => {
      onSelect(columns);
      return query;
    },
    order: () => query,
    in: () => query,
    then: (resolve, reject) => Promise.resolve({ data, error: null }).then(resolve, reject),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("supabaseProviderRepository", () => {
  it("loads provider addresses through the authorized RPC, not a direct column select", async () => {
    let propertyColumns = "";
    const property = {
      id: "property-1",
      provider_business_id: "business-1",
      location_id: "location-1",
      name: "Example property",
      property_type: "Hostel",
      description: "",
      verification_status: "unverified",
      locations: { label: "Adweso", area: "Adweso", city: "Koforidua", region: "Eastern" },
    };
    const client = {
      from: vi.fn((table) => {
        if (table === "provider_business_memberships") {
          return queryResult([{
            provider_business_id: "business-1",
            membership_role: "owner",
            provider_businesses: { id: "business-1", display_name: "Example provider" },
          }]);
        }
        if (table === "facilities") return queryResult([{ display_name: "Wi-Fi" }]);
        if (table === "properties") {
          return queryResult([property], (columns) => { propertyColumns = columns; });
        }
        return queryResult([]);
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [{ property_id: "property-1", exact_address: "12 Private Test Road" }],
        error: null,
      }),
    };
    getSupabaseClient.mockResolvedValue(client);

    const records = await getProviderWorkspaceRecords();

    expect(records.properties[0].address).toBe("12 Private Test Road");
    expect(propertyColumns).not.toContain("address");
    expect(client.rpc).toHaveBeenCalledWith(
      "get_authorized_property_addresses",
      { p_property_ids: ["property-1"] },
    );
    expect(client.from).toHaveBeenCalledWith("properties");
  });

  it("preserves existing room IDs when saving edited listing offers", async () => {
    const client = {
      rpc: vi.fn().mockResolvedValue({ data: "listing-1", error: null }),
    };
    getSupabaseClient.mockResolvedValue(client);

    await saveProviderListing("listing-1", { propertyId: "property-1" }, [{
      id: "room-1",
      roomType: "single",
      description: "Existing room",
      occupancy: "1",
      quantity: "2",
      price: "1000",
      period: "monthly",
      deposit: "",
      availabilityStatus: "unknown",
      features: "",
    }], false);

    expect(client.rpc).toHaveBeenCalledWith("save_provider_listing", expect.objectContaining({
      p_rooms: [expect.objectContaining({ id: "room-1", roomType: "single" })],
    }));
  });

  it("rejects unsupported and oversized media before uploading", async () => {
    const upload = vi.fn();
    const getUser = vi.fn();
    getSupabaseClient.mockResolvedValue({
      storage: { from: () => ({ upload }) },
      auth: { getUser },
    });

    await expect(uploadListingMedia("listing-1", [
      new File(["gif"], "floorplan.gif", { type: "image/gif" }),
    ])).rejects.toThrow("floorplan.gif: use a JPG, PNG, or WebP image up to 5 MB.");
    await expect(uploadListingMedia("listing-1", [
      new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
    ])).rejects.toThrow("large.png: use a JPG, PNG, or WebP image up to 5 MB.");

    expect(upload).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("checks the signed-in user before creating any storage object", async () => {
    const upload = vi.fn();
    const client = {
      storage: { from: () => ({ upload }) },
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    };
    getSupabaseClient.mockResolvedValue(client);

    await expect(uploadListingMedia("listing-1", [
      new File(["jpeg"], "room.jpg", { type: "image/jpeg" }),
    ])).rejects.toThrow("A signed-in provider account is required to upload listing images.");

    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads supported images as non-overwriting objects and records pending metadata", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      storage: { from: vi.fn(() => ({ upload })) },
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "provider-1" } }, error: null }) },
      from: vi.fn(() => ({ insert })),
    };
    getSupabaseClient.mockResolvedValue(client);

    await expect(uploadListingMedia("listing-1", [
      new File(["jpeg"], "room.jpg", { type: "image/jpeg" }),
    ])).resolves.toEqual([expect.stringMatching(/^listing-1\/.+\.jpg$/)]);

    expect(client.storage.from).toHaveBeenCalledWith("listing-media");
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^listing-1\/.+\.jpg$/),
      expect.any(File),
      { contentType: "image/jpeg", upsert: false },
    );
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      listing_id: "listing-1",
      processing_status: "pending",
      uploaded_by: "provider-1",
    }));
  });

  it("removes an uploaded object if its metadata row cannot be created", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const client = {
      storage: { from: vi.fn(() => ({ upload, remove })) },
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "provider-1" } }, error: null }) },
      from: vi.fn(() => ({
        insert: vi.fn().mockResolvedValue({ error: new Error("metadata rejected") }),
      })),
    };
    getSupabaseClient.mockResolvedValue(client);

    await expect(uploadListingMedia("listing-1", [
      new File(["png"], "room.png", { type: "image/png" }),
    ])).rejects.toThrow("metadata rejected");

    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^listing-1\/.+\.png$/)]);
  });
});
