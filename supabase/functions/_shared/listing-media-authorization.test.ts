import { describe, expect, it } from "vitest";
import { canProcessListingMedia } from "./listing-media-authorization";

const activeProvider = {
  userId: "provider-1",
  accountStatus: "active",
  roles: ["provider"],
  membershipRole: "owner",
  listingStatus: "draft",
};

describe("canProcessListingMedia", () => {
  it("allows an active listing member to process their listing images", () => {
    expect(canProcessListingMedia(activeProvider)).toBe(true);
  });

  it("rejects unauthenticated, inactive, student, and unrelated callers", () => {
    expect(canProcessListingMedia({ ...activeProvider, userId: null })).toBe(false);
    expect(canProcessListingMedia({ ...activeProvider, accountStatus: "suspended" })).toBe(false);
    expect(canProcessListingMedia({ ...activeProvider, roles: ["student"], membershipRole: null })).toBe(false);
    expect(canProcessListingMedia({ ...activeProvider, membershipRole: null })).toBe(false);
  });

  it("allows an active administrator to recover pending photos after publication", () => {
    expect(canProcessListingMedia({
      ...activeProvider,
      roles: ["student", "admin"],
      membershipRole: null,
      listingStatus: "published",
    })).toBe(true);
  });

  it("rejects photos attached to archived listings", () => {
    expect(canProcessListingMedia({ ...activeProvider, listingStatus: "archived" })).toBe(false);
  });
});
