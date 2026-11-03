import { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { getProviderBookings, updateBookingStatus } from "../../services/bookingService";

export default function ProviderBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setBookings(await getProviderBookings());
      setError("");
    } catch (cause) {
      setError(cause.message || "Booking requests could not be loaded.");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function decide(bookingId, status) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateBookingStatus(bookingId, status);
      setNotice(`Booking marked ${status}.`);
      await load();
    } catch (cause) {
      setError(cause.message || "Booking status could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="provider-page">
      <header className="provider-page-intro"><div><p className="provider-eyebrow">BOOKING MANAGEMENT</p><h2>Booking requests</h2><p>Only bookings for properties your business manages are returned by database policies.</p></div></header>
      <div className="provider-demo-banner" role="note"><p><strong>Payment status is server-controlled.</strong> Provider actions cannot mark a booking paid. Only a verified Paystack result can do that.</p></div>
      {notice && <p className="provider-form-success" role="status">{notice}</p>}
      {error && <p className="provider-form-error-banner" role="alert">{error}</p>}
      {!bookings.length && !error ? <div className="provider-empty-state"><h3>No booking requests</h3><p>Requests submitted by students appear here.</p></div> : (
        <div className="provider-enquiry-list">{bookings.map((booking) => (
          <article className="provider-enquiry-card" key={booking.id}>
            <div className="provider-enquiry-card-content">
              <div className="provider-enquiry-card-heading"><h3>{booking.listings?.name ?? "Accommodation listing"}</h3><span className={`provider-enquiry-status provider-enquiry-status-${booking.status}`}>{booking.status}</span></div>
              <p>{booking.listing_rooms?.label ?? "Room"} · {booking.price_amount} {booking.currency} / {booking.pricing_period}</p>
              <p>Move-in requested: {booking.move_in_date}</p>
              <p>Payment: {booking.payments?.map(({ status }) => status).join(", ") || "not started"}</p>
              <small>Received {new Date(booking.created_at).toLocaleString()}</small>
              {booking.status === "requested" && <div className="admin-actions"><button type="button" disabled={busy} onClick={() => decide(booking.id, "accepted")}><Check size={14} /> Accept</button><button type="button" disabled={busy} onClick={() => decide(booking.id, "rejected")}><X size={14} /> Reject</button></div>}
              {booking.status === "paid" && <button type="button" disabled={busy} onClick={() => decide(booking.id, "completed")}>Mark stay completed</button>}
            </div>
          </article>
        ))}</div>
      )}
    </div>
  );
}
