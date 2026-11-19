import { useState } from "react";
import { Flag } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useOptionalAuth } from "../auth/AuthProvider";
import { getSupabaseClient } from "../data/supabaseClient";

const reasons = ["Misleading information", "Suspected fraud", "Incorrect availability", "Inappropriate content", "Other"];

export default function ListingReportForm({ listingId }) {
  const auth = useOptionalAuth();
  const location = useLocation();
  const [reason, setReason] = useState(reasons[0]);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  if (!auth?.user) return <p className="listing-trust-note"><Link to="/auth/login" state={{ from: location.pathname }}>Sign in</Link> to report a listing.</p>;
  if (!auth.roles.includes("student")) return null;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const trimmed = message.trim();
    if (!trimmed || trimmed.length > 2_000) { setStatus("Describe the concern in 1 to 2,000 characters."); return; }
    setBusy(true); setStatus("");
    try {
      const client = await getSupabaseClient();
      if (!client) throw new Error("Reporting is unavailable because Supabase is not configured.");
      const { error } = await client.from("listing_reports").insert({ listing_id: listingId, reporter_user_id: auth.user.id, reason, message: trimmed });
      if (error) throw error;
      setMessage(""); setStatus("Report submitted for administrator review.");
    } catch (cause) { setStatus(cause.message || "The report could not be submitted."); }
    finally { setBusy(false); }
  }

  return <details className="listing-report"><summary><Flag size={14} /> Report this listing</summary><form onSubmit={submit}>
    <label>Reason<select value={reason} onChange={(event) => setReason(event.target.value)}>{reasons.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>What happened?<textarea value={message} maxLength="2000" required onChange={(event) => setMessage(event.target.value)} /></label>
    <button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit report"}</button>
    {status && <p role={status.startsWith("Report submitted") ? "status" : "alert"}>{status}</p>}
  </form></details>;
}
