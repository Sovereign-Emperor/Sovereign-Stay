import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseClient } = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock("./supabaseClient", () => ({ getSupabaseClient }));

import {
  getProviderWorkspaceRecords,
  saveProviderListing,
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
});
