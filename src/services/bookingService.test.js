import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ supabase: null, paymentEnabled: true }));

vi.mock("../data/supabaseClient", () => ({
  getSupabaseClient: () => Promise.resolve(mocks.supabase),
  get paymentCheckoutEnabled() {
    return mocks.paymentEnabled;
  },
}));

import {
  cancelBooking,
  getProviderBookings,
  getStudentBookings,
  requestBooking,
  startBookingPayment,
  updateBookingStatus,
} from "./bookingService";

function createClient() {
  const rows = [{ id: "booking-1", status: "requested" }];
  const query = {
    select: vi.fn(() => query),
    order: vi.fn().mockResolvedValue({ data: rows, error: null }),
  };
  return {
    rpc: vi.fn().mockResolvedValue({ data: "booking-1", error: null }),
    from: vi.fn(() => query),
    functions: { invoke: vi.fn() },
    query,
  };
}

describe("Supabase booking service", () => {
  beforeEach(() => {
    mocks.supabase = createClient();
    mocks.paymentEnabled = true;
  });

  it("requests a booking using a database-derived room price and a reusable idempotency key", async () => {
    await expect(requestBooking("room-1", "2027-01-15", "request-key-1")).resolves.toBe("booking-1");

    expect(mocks.supabase.rpc).toHaveBeenCalledWith("request_listing_booking", {
      p_listing_room_id: "room-1",
      p_move_in_date: "2027-01-15",
      p_idempotency_key: "request-key-1",
    });
  });

  it("loads student and provider queues through their RLS-scoped booking table", async () => {
    await expect(getStudentBookings()).resolves.toEqual([{ id: "booking-1", status: "requested" }]);
    await expect(getProviderBookings()).resolves.toEqual([{ id: "booking-1", status: "requested" }]);
    expect(mocks.supabase.from).toHaveBeenNthCalledWith(1, "bookings");
    expect(mocks.supabase.from).toHaveBeenNthCalledWith(2, "bookings");
  });

  it("delegates cancellation and provider decisions to authorized database functions", async () => {
    await cancelBooking("booking-1");
    await updateBookingStatus("booking-1", "accepted");

    expect(mocks.supabase.rpc).toHaveBeenNthCalledWith(1, "cancel_booking_request", {
      p_booking_id: "booking-1",
    });
    expect(mocks.supabase.rpc).toHaveBeenNthCalledWith(2, "provider_update_booking_status", {
      p_booking_id: "booking-1",
      p_status: "accepted",
    });
  });

  it("surfaces missing backend configuration instead of falling back to demo data", async () => {
    mocks.supabase = null;
    await expect(getStudentBookings()).rejects.toThrow(/configured Supabase project/);
  });

  it("does not call the payment function when checkout is disabled", async () => {
    mocks.paymentEnabled = false;
    await expect(startBookingPayment("booking-1")).rejects.toThrow(
      "Payment checkout is disabled for this deployment.",
    );
    expect(mocks.supabase.functions.invoke).not.toHaveBeenCalled();
  });
});
