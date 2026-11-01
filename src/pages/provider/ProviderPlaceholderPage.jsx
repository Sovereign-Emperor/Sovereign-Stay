import { ArrowLeft, ArrowRight, Building2, MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";

const pageContent = {
  enquiries: {
    eyebrow: "PROVIDER INBOX",
    title: "Enquiry management is not connected yet.",
    description: "The dashboard includes illustrative enquiry totals only. There are no real student messages or viewing requests in this demo.",
    icon: MessageSquareText,
    actionLabel: "Back to overview",
    actionTo: "/provider",
  },
  "not-found": {
    eyebrow: "PROVIDER WORKSPACE",
    title: "That dashboard page is not available.",
    description: "Choose an existing section to continue exploring the demo workspace.",
    icon: Building2,
    actionLabel: "Back to overview",
    actionTo: "/provider",
  },
};

/**
 * Honest destination for provider features that are not implemented yet.
 *
 * @param {{ page: keyof typeof pageContent }} props
 */
export default function ProviderPlaceholderPage({ page }) {
  const content = pageContent[page] ?? pageContent["not-found"];
  const Icon = content.icon;

  return (
    <div className="provider-page provider-placeholder">
      <Link className="provider-back-link" to="/provider"><ArrowLeft size={15} /> Provider overview</Link>
      <div className="provider-placeholder-card">
        <span className="provider-placeholder-icon"><Icon size={23} /></span>
        <p className="provider-eyebrow">{content.eyebrow} · DEMO</p>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
        <Link className="provider-primary-button" to={content.actionTo}>
          {content.actionLabel} <ArrowRight size={16} />
        </Link>
        <span className="provider-placeholder-note">No authentication · No backend · No saved changes</span>
      </div>
    </div>
  );
}
