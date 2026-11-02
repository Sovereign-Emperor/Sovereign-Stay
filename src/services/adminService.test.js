import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSupabaseClient } from "../data/supabaseClient";
import { moderateListing, updateAccountStatus } from "./adminService";

vi.mock("../data/supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
}));

describe("adminService", () => {
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getSupabaseClient.mockResolvedValue({ rpc });
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it("uses the database moderation function rather than directly editing a listing", async () => {
    await moderateListing("listing-1", "reject", "Missing required details");

    expect(rpc).toHaveBeenCalledWith("admin_review_listing", {
      p_listing_id: "listing-1",
      p_decision: "reject",
      p_reason: "Missing required details",
    });
  });

  it("passes an audit reason when restricting an account", async () => {
    await updateAccountStatus("user-1", "suspended", "Repeated misleading information");

    expect(rpc).toHaveBeenCalledWith("admin_set_account_status", {
      p_user_id: "user-1",
      p_status: "suspended",
      p_reason: "Repeated misleading information",
    });
  });

  it("surfaces database authorization errors", async () => {
    rpc.mockResolvedValue({ data: null, error: new Error("Administrator permission is required.") });

    await expect(moderateListing("listing-1", "publish")).rejects.toThrow(
      "Administrator permission is required.",
    );
  });
});
