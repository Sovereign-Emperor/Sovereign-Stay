import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Inbox, MessageSquareText } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getSupabaseProviderEnquiries, getSupabaseProviderEnquiry, setSupabaseEnquiryStatus } from "../../data/supabaseEnquiryRepository";

const statuses = [["", "All statuses"], ["new", "New"], ["in_progress", "Contacted"], ["closed", "Closed"]];
const statusLabels = { new: "New", in_progress: "Contacted", closed: "Closed" };
const one = (value) => Array.isArray(value) ? value[0] ?? null : value ?? null;

export function ProviderBackendEnquiries() {
  const [status, setStatus] = useState("");
  const [records, setRecords] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setRecords(await getSupabaseProviderEnquiries(status));
      setError("");
    } catch (cause) {
      setError(cause.message || "The provider inbox could not be loaded.");
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="provider-page provider-enquiries-page">
      <header className="provider-page-intro"><div><p className="provider-eyebrow">STUDENT MESSAGES · SUPABASE</p><h2>Enquiry inbox</h2><p>These records are stored in Supabase and scoped by provider business membership.</p></div><label className="provider-enquiry-status-filter">Filter by status<select value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></header>
      {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
      {records.length ? <div className="provider-enquiry-list">{records.map((record) => {
        const listing = one(record.listings);
        const property = one(listing?.properties);
        return <article className="provider-enquiry-card" key={record.id}>
          <div className="provider-enquiry-card-icon"><MessageSquareText size={18} /></div>
          <div className="provider-enquiry-card-content">
            <div className="provider-enquiry-card-heading"><h3>{record.student_name}</h3><span className={`provider-enquiry-status provider-enquiry-status-${record.status}`}>{statusLabels[record.status]}</span></div>
            <p>{listing?.name ?? "Listing"} · {listing?.location_summary ?? property?.name ?? "Location"}</p>
            <p>{record.message}</p>
            <small>{new Date(record.created_at).toLocaleString()} {record.viewing_date ? `· Viewing requested ${record.viewing_date}` : ""}</small>
          </div>
          <Link to={`/provider/enquiries/${record.id}`} aria-label={`Open enquiry from ${record.student_name}`}><ArrowRight size={17} /></Link>
        </article>;
      })}</div> : !error && <div className="provider-empty-state"><Inbox size={25} aria-hidden="true" /><h3>{status ? "No enquiries with this status" : "No student enquiries yet"}</h3><p>Enquiries submitted to listings owned by your provider business appear here.</p><Link className="provider-outline-button" to="/provider/listings">Review your listings <ArrowRight size={15} /></Link></div>}
    </div>
  );
}

export function ProviderBackendEnquiryDetail() {
  const { enquiryId } = useParams();
  const [enquiry, setEnquiry] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const record = await getSupabaseProviderEnquiry(enquiryId);
      setEnquiry(record);
      setError(record ? "" : "This enquiry is not in the current provider workspace.");
    } catch (cause) {
      setError(cause.message || "The enquiry could not be loaded.");
    }
  }, [enquiryId]);
  useEffect(() => { load(); }, [load]);

  async function changeStatus(status) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await setSupabaseEnquiryStatus(enquiryId, status);
      setNotice(`Enquiry marked ${statusLabels[status].toLowerCase()}.`);
      await load();
    } catch (cause) {
      setError(cause.message || "The enquiry status could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  if (!enquiry && !error) return <div className="provider-page" role="status">Loading enquiry…</div>;
  if (!enquiry) return <div className="provider-page provider-empty-state" role="alert"><h2>Enquiry not found</h2><p>{error}</p><Link className="provider-primary-button" to="/provider/enquiries">Back to inbox</Link></div>;
  const listing = one(enquiry.listings);
  const property = one(listing?.properties);

  return <div className="provider-page provider-enquiry-detail">
    <Link className="provider-back-link" to="/provider/enquiries">← Back to inbox</Link>
    {notice && <p className="provider-form-success" role="status">{notice}</p>}
    {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
    <header className="provider-page-intro"><div><p className="provider-eyebrow">ENQUIRY DETAILS · SUPABASE</p><h2>Message from {enquiry.student_name}</h2><p>Received {new Date(enquiry.created_at).toLocaleString()}</p></div><span className={`provider-enquiry-status provider-enquiry-status-${enquiry.status}`}>{statusLabels[enquiry.status]}</span></header>
    <section className="provider-enquiry-detail-card"><dl>
      <div><dt>Listing</dt><dd><Link to={`/properties/${enquiry.listing_id}`}>{listing?.name ?? "Accommodation listing"}</Link></dd></div>
      <div><dt>Property</dt><dd>{property?.name ?? "Property"}</dd></div>
      <div><dt>Student name</dt><dd>{enquiry.student_name}</dd></div>
      <div><dt>Email</dt><dd><a href={`mailto:${encodeURIComponent(enquiry.student_email)}`}>{enquiry.student_email}</a></dd></div>
      <div><dt>Phone</dt><dd><a href={`tel:${enquiry.student_phone.replace(/[^\d+]/g, "")}`}>{enquiry.student_phone}</a></dd></div>
      <div><dt>Viewing request</dt><dd>{enquiry.viewing_date ?? "No date requested"}</dd></div>
      <div><dt>Message</dt><dd className="provider-enquiry-message">{enquiry.message}</dd></div>
    </dl>
    <div className="provider-enquiry-actions"><label>Status<select value={enquiry.status} disabled={busy || enquiry.status === "closed"} onChange={(event) => changeStatus(event.target.value)}><option value="new">New</option><option value="in_progress">Contacted</option><option value="closed">Closed</option></select></label></div>
    <p className="provider-demo-banner" role="note">Only owners and managers can change enquiry status. Database row-level security enforces this permission.</p>
    </section>
  </div>;
}
