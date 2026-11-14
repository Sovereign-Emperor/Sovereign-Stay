const ALLOWED_LISTING_STATUSES = new Set([
  "draft",
  "pending_approval",
  "rejected",
  "published",
]);
const ALLOWED_MEMBERSHIP_ROLES = new Set(["owner", "manager", "editor"]);

export function canProcessListingMedia({
  userId,
  accountStatus,
  roles,
  membershipRole,
  listingStatus,
}: {
  userId: string | null;
  accountStatus: string | null;
  roles: string[];
  membershipRole: string | null;
  listingStatus: string | null;
}) {
  if (!userId || accountStatus !== "active" || !listingStatus) return false;
  if (!ALLOWED_LISTING_STATUSES.has(listingStatus)) return false;
  if (roles.includes("admin")) return true;
  return ALLOWED_MEMBERSHIP_ROLES.has(membershipRole ?? "");
}
