import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { paymentCheckoutEnabled } from "../data/supabaseClient";
import { cancelBooking, getStudentBookings, startBookingPayment } from "../services/bookingService";

export default function StudentBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      setBookings(await getStudentBookings());
      setError("");
    } catch (cause) {
      setError(cause.message || "Your bookings could not be loaded.");
    }
  }, []);

  useEffect(() => { load(); }, [load, user]);

  async function act(id, operation) {
    setBusyId(id);
    setError("");
    try {
      await operation();
      await load();
    } catch (cause) {
      setError(cause.message || "The booking action could not be completed.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main className="student-bookings-page">
      <header><p className="eyebrow">YOUR ACCOUNT</p><h1>Booking requests</h1><p>Payment is confirmed only after the server verifies the Paystack transaction.</p>{!paymentCheckoutEnabled && <p role="note">Payment checkout is disabled for this deployment. You can still manage booking requests.</p>}</header>
      {error && <p role="alert">{error}</p>}
      {!bookings.length && !error && <section><h2>No bookings yet</h2><p>Published listings with bookable room offers will let you send a request.</p><Link to="/">Explore accommodation</Link></section>}
      <div>{bookings.map((booking) => (
        <article key={booking.id}>
          <h2><Link to={`/properties/${booking.listing_id}`}>{booking.listings?.name ?? "Accommodation"}</Link></h2>
          <p>{booking.listing_rooms?.label ?? "Room option"} · {booking.price_amount} {booking.currency} / {booking.pricing_period} · move-in {booking.move_in_date}</p>
          <strong>Booking: {booking.status}</strong>
          {booking.payments?.map((payment) => <p key={payment.id}>Payment: {payment.status} · reference {payment.provider_reference}</p>)}
          {booking.status === "accepted" && paymentCheckoutEnabled && <button disabled={busyId === booking.id} onClick={() => act(booking.id, () => startBookingPayment(booking.id))}>Pay securely</button>}
          {["requested", "accepted"].includes(booking.status) && <button disabled={busyId === booking.id} onClick={() => act(booking.id, () => cancelBooking(booking.id))}>Cancel request</button>}
        </article>
      ))}</div>
    </main>
  );
}
