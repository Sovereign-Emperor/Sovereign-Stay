import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useOptionalAuth } from "../auth/AuthProvider";
import { isExplicitSupabaseMode } from "../data/supabaseClient";
import { cancelBooking, getStudentBookings, requestBooking, startBookingPayment } from "../services/bookingService";
import { formatPrice } from "../utils/format";

export default function BookingRequestPanel({ listing }) {
  const auth = useOptionalAuth();
  const [roomId, setRoomId] = useState(listing.roomOffers[0]?.id ?? "");
  const [moveInDate, setMoveInDate] = useState("");
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestKey = useRef(null);

  const loadBookings = useCallback(async () => {
    if (!auth?.user) return;
    try {
      setBookings(await getStudentBookings());
    } catch (cause) {
      setError(cause.message || "Booking history could not be loaded.");
    }
  }, [auth?.user]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  if (!isExplicitSupabaseMode || listing.isDemo) return null;

  async function submitRequest(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!requestKey.current || requestKey.current.roomId !== roomId || requestKey.current.moveInDate !== moveInDate) {
        requestKey.current = { roomId, moveInDate, key: crypto.randomUUID() };
      }
      await requestBooking(roomId, moveInDate, requestKey.current.key);
      requestKey.current = null;
      setMessage("Your booking request was saved. A provider must accept it before payment can begin.");
      await loadBookings();
    } catch (cause) {
      setError(cause.message || "The booking request could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(bookingId) {
    setBusy(true);
    setError("");
    try {
      await cancelBooking(bookingId);
      setMessage("The booking request was cancelled.");
      await loadBookings();
    } catch (cause) {
      setError(cause.message || "The booking could not be cancelled.");
    } finally {
      setBusy(false);
    }
  }

  async function pay(bookingId) {
    setBusy(true);
    setError("");
    try {
      await startBookingPayment(bookingId);
    } catch (cause) {
      setError(cause.message || "Payment could not be initialized.");
      setBusy(false);
    }
  }

  return (
    <section className="booking-panel" aria-labelledby="booking-panel-heading">
      <h3 id="booking-panel-heading">Request this room</h3>
      {auth?.loading ? <p role="status">Checking your student account…</p> : !auth?.user ? (
        <p><Link to="/auth/login" state={{ from: window.location.pathname }}>Sign in to request a booking.</Link> A verified student account is required.</p>
      ) : !auth?.roles.includes("student") ? (
        <p>A student account is required to request a booking.</p>
      ) : (
        <form onSubmit={submitRequest}>
          <label>Room option<select value={roomId} onChange={(event) => setRoomId(event.target.value)} required>
            {listing.roomOffers.filter(({ availabilityStatus, quantity }) => availabilityStatus !== "unavailable" && quantity != null && Number(quantity) > 0).map((offer) => <option key={offer.id} value={offer.id}>{offer.roomType} · {formatPrice(offer.price)} / {String(offer.pricePeriod).replaceAll("_", " ")}</option>)}
          </select></label>
          <label>Requested move-in date<input type="date" min={new Date().toISOString().slice(0, 10)} value={moveInDate} onChange={(event) => setMoveInDate(event.target.value)} required /></label>
          <button type="submit" disabled={busy || !roomId}>{busy ? "Sending request…" : "Request to book"}</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {bookings.length > 0 && <div className="booking-history"><h4>Your booking requests</h4>{bookings.filter(({ listing_id: listingId }) => listingId === listing.id).map((booking) => (
        <article key={booking.id}>
          <strong>{booking.listings?.name ?? listing.name} · {booking.listing_rooms?.label ?? "Room"}</strong>
          <span>{booking.status} · move-in {booking.move_in_date}</span>
          {booking.payments?.map((payment) => <small key={payment.id}>Payment: {payment.status} · {payment.currency} {(payment.amount_pesewas / 100).toFixed(2)}</small>)}
          {booking.status === "accepted" && <button type="button" disabled={busy} onClick={() => pay(booking.id)}>Pay securely with Paystack</button>}
          {["requested", "accepted"].includes(booking.status) && <button type="button" disabled={busy} onClick={() => cancel(booking.id)}>Cancel request</button>}
        </article>
      ))}</div>}
    </section>
  );
}
