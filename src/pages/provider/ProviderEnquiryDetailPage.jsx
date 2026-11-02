import { useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import {
  getProviderEnquiry,
  updateProviderEnquiryStatus,
} from "../../services/enquiryService";

const labelByStatus = { new: "New", in_progress: "Contacted", closed: "Closed" };

export default function ProviderEnquiryDetailPage() {
  const { enquiryId } = useParams();
  const [enquiry, setEnquiry] = useState(() => getProviderEnquiry(DEMO_PROVIDER_ID, enquiryId));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (!enquiry) {
    return <div className="provider-page provider-empty-state"><h2>Enquiry not found</h2><p>This message is not part of the current provider&apos;s inbox.</p><Link className="provider-primary-button" to="/provider/enquiries"><ArrowLeft size={16} /> Back to inbox</Link></div>;
  }

  function changeStatus(status) {
    try {
      setEnquiry((current) => ({ ...current, ...updateProviderEnquiryStatus(DEMO_PROVIDER_ID, enquiry.id, status) }));
      setNotice(`Enquiry marked ${labelByStatus[status].toLowerCase()}.`);
      setError("");
    } catch (cause) {
      setError(cause.message);
    }
  }

  return (
    <div className="provider-page provider-enquiry-detail">
      <Link className="provider-back-link" to="/provider/enquiries"><ArrowLeft size={15} /> Back to inbox</Link>
      {notice && <p className="provider-form-success" role="status">{notice}</p>}
      {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
      <header className="provider-page-intro"><div><p className="provider-eyebrow">ENQUIRY DETAILS · LOCAL DEMO</p><h2>Message from {enquiry.name}</h2><p>Received {new Date(enquiry.createdAt).toLocaleString()}</p></div><span className={`provider-enquiry-status provider-enquiry-status-${enquiry.status}`}>{labelByStatus[enquiry.status]}</span></header>
      <div className="provider-demo-banner" role="note"><p><strong>Local demo message.</strong> This message has not been delivered to or verified by a real provider.</p></div>
      <section className="provider-enquiry-detail-card">
        <dl>
          <div><dt>Listing</dt><dd><Link to={`/provider/listings/${enquiry.listingId}`}>{enquiry.listing.name} <ExternalLink size={14} /></Link></dd></div>
          <div><dt>Property</dt><dd>{enquiry.listing.propertyName}</dd></div>
          <div><dt>Student name</dt><dd>{enquiry.name}</dd></div>
          <div><dt>Email</dt><dd><a href={`mailto:${encodeURIComponent(enquiry.email)}`}>{enquiry.email}</a></dd></div>
          <div><dt>Phone</dt><dd><a href={`tel:${enquiry.phone.replace(/[^\d+]/g, "")}`}>{enquiry.phone}</a></dd></div>
          <div><dt>Viewing request</dt><dd>{enquiry.viewingDate ?? "No date requested"}</dd></div>
          <div><dt>Message</dt><dd className="provider-enquiry-message">{enquiry.message}</dd></div>
        </dl>
        <div className="provider-enquiry-actions">
          <label>Status<select value={enquiry.status} onChange={(event) => changeStatus(event.target.value)}><option value="new">New</option><option value="in_progress">Contacted</option><option value="closed">Closed</option></select></label>
          {enquiry.status === "new" && <button className="provider-primary-button" type="button" onClick={() => changeStatus("in_progress")}>Mark contacted</button>}
          {enquiry.status !== "closed" && <button className="provider-outline-button" type="button" onClick={() => changeStatus("closed")}>Close enquiry</button>}
          {enquiry.status === "closed" && <button className="provider-outline-button" type="button" onClick={() => changeStatus("new")}>Reopen as new</button>}
        </div>
      </section>
    </div>
  );
}
