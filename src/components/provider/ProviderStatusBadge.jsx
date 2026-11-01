const statusLabels = {
  draft: "Draft",
  pending_approval: "Pending review",
  published: "Published",
  rejected: "Rejected",
  archived: "Archived",
};

/**
 * Render a listing lifecycle label without implying availability or verification.
 *
 * @param {{ status: string }} props Listing lifecycle status.
 */
export default function ProviderStatusBadge({ status }) {
  const label = statusLabels[status] ?? "Unknown status";

  return (
    <span className={`provider-status-badge provider-status-${status}`}>
      <span aria-hidden="true" />
      {label}
    </span>
  );
}
