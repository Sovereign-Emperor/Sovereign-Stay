import { useState } from "react";
import { ArrowRight, Inbox, MessageSquareText } from "lucide-react";
import { Link } from "react-router-dom";
import { DEMO_PROVIDER_ID } from "../../data/demoProviderRepository";
import { getProviderEnquiries } from "../../services/enquiryService";
import { isExplicitSupabaseMode } from "../../data/supabaseClient";
import { ProviderBackendEnquiries } from "./ProviderBackendEnquiries";

const statuses = [
  ["", "All statuses"],
  ["new", "New"],
  ["in_progress", "Contacted"],
  ["closed", "Closed"],
];

function DemoProviderEnquiriesPage() {
  const [status, setStatus] = useState("");
  let enquiries;
  try {
    enquiries = getProviderEnquiries(DEMO_PROVIDER_ID, status);
  } catch (error) {
    return <div className="provider-page provider-empty-state" role="alert"><h2>Inbox could not be loaded</h2><p>{error.message}</p></div>;
  }

  return (
    <div className="provider-page provider-enquiries-page">
      <header className="provider-page-intro">
        <div><p className="provider-eyebrow">STUDENT MESSAGES · LOCAL DEMO</p><h2>Enquiry inbox</h2><p>Messages submitted from published listing pages in this browser.</p></div>
        <label className="provider-enquiry-status-filter">Filter by status<select value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </header>
      <div className="provider-demo-banner" role="note"><p><strong>Local demo inbox.</strong> Enquiries stay in this browser and are not delivered in real time. Contact details are sample user-submitted demo data only.</p></div>
      {enquiries.length ? (
        <div className="provider-enquiry-list">{enquiries.map((enquiry) => (
          <article className="provider-enquiry-card" key={enquiry.id}>
            <div className="provider-enquiry-card-icon"><MessageSquareText size={18} /></div>
            <div className="provider-enquiry-card-content">
              <div className="provider-enquiry-card-heading"><h3>{enquiry.name}</h3><span className={`provider-enquiry-status provider-enquiry-status-${enquiry.status}`}>{enquiry.status === "in_progress" ? "Contacted" : enquiry.status}</span></div>
              <p>{enquiry.listing.name} · {enquiry.listing.location}</p>
              <p>{enquiry.message}</p>
              <small>{new Date(enquiry.createdAt).toLocaleString()} {enquiry.viewingDate ? `· Viewing requested ${enquiry.viewingDate}` : ""}</small>
            </div>
            <Link to={`/provider/enquiries/${enquiry.id}`} aria-label={`Open enquiry from ${enquiry.name}`}><ArrowRight size={17} /></Link>
          </article>
        ))}</div>
      ) : (
        <div className="provider-empty-state"><Inbox size={25} aria-hidden="true" /><h3>{status ? "No enquiries with this status" : "No student enquiries yet"}</h3><p>Enquiries submitted through published demo listings will appear here.</p><Link className="provider-outline-button" to="/provider/listings">Review your listings <ArrowRight size={15} /></Link></div>
      )}
    </div>
  );
}

export default function ProviderEnquiriesPage() {
  return isExplicitSupabaseMode ? <ProviderBackendEnquiries /> : <DemoProviderEnquiriesPage />;
}
