import {
  authenticateUser,
  checkBrowserOrigin,
  response,
  verifyPaystackReference,
} from "../_shared/paystack.ts";

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? undefined;
  if (request.method === "OPTIONS") {
    return checkBrowserOrigin(request) ?? response({}, 200, origin);
  }
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405, origin);
  const originError = checkBrowserOrigin(request);
  if (originError) return originError;

  try {
    const { user, serviceClient } = await authenticateUser(request);
    let body;
    try {
      body = await request.json();
    } catch {
      return response({ error: "Request body must be valid JSON." }, 400, origin);
    }
    if (!body || typeof body !== "object") {
      return response({ error: "A valid payment reference is required." }, 400, origin);
    }
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    if (!/^SS-[0-9a-f]{32}$/i.test(reference)) {
      return response({ error: "A valid payment reference is required." }, 400, origin);
    }

    const { data: payment, error: lookupError } = await serviceClient
      .from("payments")
      .select("id, booking_id, student_user_id, provider_reference, amount_pesewas, currency, status")
      .eq("provider_reference", reference)
      .maybeSingle();
    if (lookupError || !payment || payment.student_user_id !== user.id) {
      return response({ error: "Payment not found for this account." }, 404, origin);
    }
    if (payment.status === "succeeded") {
      return response({ status: "succeeded", bookingId: payment.booking_id, reference }, 200, origin);
    }

    const transaction = await verifyPaystackReference(reference);
    if (transaction.reference !== reference) {
      return response({ error: "Gateway reference did not match the booking payment." }, 409, origin);
    }
    if (transaction.status === "success") {
      if (transaction.currency !== payment.currency ||
        transaction.amount !== Number(payment.amount_pesewas)) {
        console.error("paystack.verification_mismatch", { paymentId: payment.id });
        return response({ error: "Verified transaction amount or currency did not match the booking." }, 409, origin);
      }
      const { data: bookingId, error: applyError } = await serviceClient.rpc("apply_verified_paystack_payment", {
        p_reference: reference,
        p_amount_pesewas: transaction.amount,
        p_currency: transaction.currency,
        p_gateway_transaction_id: String(transaction.id),
      });
      if (applyError) {
        console.error("paystack.database_finalization_failed", { paymentId: payment.id });
        return response({ error: "Payment verification succeeded, but booking finalization needs support." }, 503, origin);
      }
      return response({ status: "succeeded", bookingId, reference }, 200, origin);
    }
    if (transaction.status === "failed") {
      const { error: failureError } = await serviceClient.rpc("mark_paystack_payment_failed", {
        p_reference: reference,
        p_gateway_transaction_id: String(transaction.id),
        p_failure_reason: "Paystack reported a failed transaction.",
      });
      if (failureError) {
        console.error("paystack.failure_recording_failed", { paymentId: payment.id });
        return response({ error: "The failed payment needs support before another attempt." }, 503, origin);
      }
      return response({ status: "failed", reference }, 200, origin);
    }
    return response({ status: "pending", reference }, 200, origin);
  } catch (error) {
    console.error("paystack.verification_error", { message: error.message });
    const status = error.message.includes("signed-in user") ? 401 : 500;
    return response({ error: status === 401 ? error.message : "Payment verification is temporarily unavailable." }, status, origin);
  }
});
