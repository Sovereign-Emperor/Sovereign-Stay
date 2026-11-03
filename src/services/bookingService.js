import { getSupabaseClient } from "../data/supabaseClient";

async function requireClient() {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Booking services need a configured Supabase project.");
  return client;
}

export async function requestBooking(roomOfferId, moveInDate, idempotencyKey = crypto.randomUUID()) {
  const client = await requireClient();
  const { data, error } = await client.rpc("request_listing_booking", {
    p_listing_room_id: roomOfferId,
    p_move_in_date: moveInDate,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data;
}

export async function getStudentBookings() {
  const client = await requireClient();
  const { data, error } = await client
    .from("bookings")
    .select("id, listing_id, listing_room_id, move_in_date, price_amount, currency, pricing_period, status, created_at, listings(name), listing_rooms(label), payments(id, provider_reference, amount_pesewas, currency, status, created_at, verified_at)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function cancelBooking(bookingId) {
  const client = await requireClient();
  const { error } = await client.rpc("cancel_booking_request", { p_booking_id: bookingId });
  if (error) throw error;
}

export async function startBookingPayment(bookingId) {
  const client = await requireClient();
  const { data, error } = await client.functions.invoke("paystack-initiate", {
    body: { bookingId, idempotencyKey: crypto.randomUUID() },
  });
  if (error) throw error;
  const checkout = new URL(data?.authorizationUrl ?? "");
  if (checkout.protocol !== "https:" || checkout.hostname !== "checkout.paystack.com") {
    throw new Error("The payment service returned an unsafe checkout URL.");
  }
  window.location.assign(checkout.toString());
}

export async function getProviderBookings() {
  const client = await requireClient();
  const { data, error } = await client
    .from("bookings")
    .select("id, listing_id, listing_room_id, move_in_date, price_amount, currency, pricing_period, status, created_at, listings(name), listing_rooms(label), payments(id, provider_reference, amount_pesewas, currency, status, created_at, verified_at)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateBookingStatus(bookingId, status) {
  const client = await requireClient();
  const { error } = await client.rpc("provider_update_booking_status", {
    p_booking_id: bookingId,
    p_status: status,
  });
  if (error) throw error;
}
