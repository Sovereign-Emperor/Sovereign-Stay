import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, ShieldCheck } from "lucide-react";
import {
  getAdminDashboardData,
  moderateListing,
  moderateReview,
  resolveListingReport,
  updateAccountStatus,
  updateBusinessVerification,
  updatePropertyVerification,
} from "../services/adminService";

const verificationOptions = ["unverified", "pending", "verified", "rejected"];

function AdminRecord({ title, children }) {
  return <article className="admin-record"><h3>{title}</h3>{children}</article>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    setError("");
    try {
      setData(await getAdminDashboardData());
    } catch (cause) {
      setError(cause.message || "Administrator records could not be loaded.");
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function perform(action, successMessage) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(successMessage);
      await loadData();
    } catch (cause) {
      setError(cause.message || "The administrator action could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-page">
      <header className="provider-page-intro">
        <div><p className="provider-eyebrow">RESTRICTED ADMINISTRATION</p><h1>Trust and safety</h1><p>Changes are authorized by database policies and audited. Review sample data carefully; demo records are not real users or properties.</p></div>
        <ShieldCheck size={26} aria-hidden="true" />
      </header>
      <div className="provider-demo-banner" role="note"><p><strong>Administrator access only.</strong> The page does not grant administrator privileges. Role assignments must be made by a trusted database operator; every action is rechecked by a restricted database function.</p></div>
      <p className="admin-record-limit">Recent record lists are capped at 100 rows per category; totals below reflect only the records currently loaded.</p>
      {notice && <p className="provider-form-success" role="status">{notice}</p>}
      {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
      {!data && !error && <p role="status">Loading protected administrator records…</p>}
      {data && <>
        <section className="admin-metrics" aria-label="Platform record totals">
          {[["Profiles loaded", data.profiles.length], ["Businesses loaded", data.businesses.length], ["Properties loaded", data.properties.length], ["Listings loaded", data.listings.length], ["Active reports loaded", data.reports.filter(({ status }) => status === "open" || status === "reviewing").length], ["Pending reviews loaded", data.reviews.filter(({ status }) => status === "pending").length]].map(([label, total]) => <div key={label}><strong>{total}</strong><span>{label}</span></div>)}
        </section>

        <section className="admin-section"><h2><AlertTriangle size={17} /> Listing moderation</h2>
          {data.listings.filter(({ status }) => status === "pending_approval").map((listing) => <AdminRecord key={listing.id} title={listing.name}><p>{listing.status} · {listing.id}</p><div className="admin-actions"><button disabled={busy} onClick={() => perform(() => moderateListing(listing.id, "publish"), "Listing moderated and published.")}>Approve</button><button disabled={busy} onClick={() => perform(() => moderateListing(listing.id, "reject", "Does not meet current listing requirements."), "Listing rejected with a recorded reason.")}>Reject</button></div></AdminRecord>)}
          {!data.listings.some(({ status }) => status === "pending_approval") && <p>No listings are awaiting moderation.</p>}
        </section>

        <section className="admin-section"><h2>Provider and property verification</h2>
          {data.businesses.map((business) => <AdminRecord key={business.id} title={business.display_name}><p>Provider business · {business.verification_status}</p><label>Verification status<select value={business.verification_status} disabled={busy} onChange={(event) => perform(() => updateBusinessVerification(business.id, event.target.value, "Administrator review from trust dashboard."), "Provider verification status updated.")}>{verificationOptions.map((option) => <option key={option}>{option}</option>)}</select></label></AdminRecord>)}
          {data.properties.map((property) => <AdminRecord key={property.id} title={property.name}><p>Property · {property.verification_status}</p><label>Verification status<select value={property.verification_status} disabled={busy} onChange={(event) => perform(() => updatePropertyVerification(property.id, event.target.value, "Administrator review from trust dashboard."), "Property verification status updated.")}>{verificationOptions.map((option) => <option key={option}>{option}</option>)}</select></label></AdminRecord>)}
        </section>

        <section className="admin-section"><h2>Listing reports</h2>
          {data.reports.filter(({ status }) => status === "open" || status === "reviewing").map((report) => <AdminRecord key={report.id} title={`${report.reason} · listing ${report.listing_id}`}><p>{report.message}</p><div className="admin-actions"><button disabled={busy} onClick={() => perform(() => resolveListingReport(report.id, "reviewing", "Administrator review started."), "Report marked as under review.")}>Review</button><button disabled={busy} onClick={() => perform(() => resolveListingReport(report.id, "resolved", "Reviewed by the administrator."), "Report resolved.")}><Check size={14} /> Resolve</button><button disabled={busy} onClick={() => perform(() => resolveListingReport(report.id, "dismissed", "Report reviewed and dismissed."), "Report dismissed.")}>Dismiss</button></div></AdminRecord>)}
          {!data.reports.some(({ status }) => status === "open" || status === "reviewing") && <p>No active reports.</p>}
        </section>

        <section className="admin-section"><h2>Review moderation</h2>
          {data.reviews.filter(({ status }) => status === "pending").map((review) => <AdminRecord key={review.id} title={`${review.rating}/5 · listing ${review.listing_id}`}><p>{review.body}</p><div className="admin-actions"><button disabled={busy} onClick={() => perform(() => moderateReview(review.id, "published"), "Review published.")}>Publish review</button><button disabled={busy} onClick={() => perform(() => moderateReview(review.id, "rejected", "Does not meet review guidelines."), "Review rejected.")}>Reject review</button></div></AdminRecord>)}
          {!data.reviews.some(({ status }) => status === "pending") && <p>No reviews are awaiting moderation.</p>}
        </section>

        <section className="admin-section"><h2>Account restrictions</h2>
          {data.profiles.map((profile) => <AdminRecord key={profile.id} title={profile.display_name || profile.id}><p>{profile.account_status} · Account {profile.id}</p><div className="admin-actions">{profile.account_status === "active" ? <button disabled={busy} onClick={() => {
            const reason = window.prompt("Why should this account be suspended?");
            if (reason?.trim()) perform(() => updateAccountStatus(profile.id, "suspended", reason), "Account suspended.");
          }}>Suspend account</button> : <button disabled={busy} onClick={() => perform(() => updateAccountStatus(profile.id, "active", "Restored after administrator review."), "Account restored.")}>Restore account</button>}</div></AdminRecord>)}
        </section>
      </>}
    </main>
  );
}
