import {
  isValidPaystackReference,
  matchesPaystackPayment,
  requireEnvironment,
  response,
  verifyPaystackReference,
  verifyWebhookSignature,
} from "../_shared/paystack.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405);

  try {
    const [url, serviceRoleKey] = requireEnvironment("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");
    const rawBody = await request.text();
    if (rawBody.length > 1_000_000) {
      return response({ error: "Webhook payload is too large." }, 413);
    }
    const signature = request.headers.get("x-paystack-signature") ?? "";
    if (!signature || !(await verifyWebhookSignature(rawBody, signature))) {
      return response({ error: "Webhook signature is invalid." }, 401);
    }

    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return response({ error: "Webhook payload must be valid JSON." }, 400);
    }
    if (!event || typeof event !== "object" ||
      !["charge.success", "charge.failed"].includes(event.event) ||
      !isValidPaystackReference(event.data?.reference)) {
      return response({ received: true, ignored: true });
    }
    const transaction = await verifyPaystackReference(event.data.reference);
    if (transaction.reference !== event.data.reference) {
      return response({ error: "Verified transaction reference did not match the webhook." }, 409);
    }

    const serviceClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: payment, error: paymentError } = await serviceClient
      .from("payments")
      .select("id, booking_id, student_user_id, provider_reference, amount_pesewas, currency, status")
      .eq("provider_reference", transaction.reference)
      .maybeSingle();
    if (paymentError) {
      console.error("paystack.webhook_payment_lookup_failed", { code: paymentError.code });
      return response({ error: "Payment could not be matched to the webhook." }, 503);
    }
    if (!payment) return response({ received: true, ignored: true });
    if (!matchesPaystackPayment(
      transaction,
      payment.provider_reference,
      Number(payment.amount_pesewas),
      payment.currency,
    )) {
      console.error("paystack.webhook_payment_mismatch", { paymentId: payment.id });
      return response({ error: "Verified transaction does not match the recorded payment." }, 409);
    }

    const { data: booking, error: bookingError } = await serviceClient
      .from("bookings")
      .select("student_user_id, status")
      .eq("id", payment.booking_id)
      .maybeSingle();
    if (bookingError || !booking || booking.student_user_id !== payment.student_user_id) {
      console.error("paystack.webhook_booking_mismatch", { paymentId: payment.id });
      return response({ error: "Payment ownership could not be verified." }, 503);
    }
    if (payment.status === "succeeded" && transaction.status === "failed") {
      console.error("paystack.webhook_stale_failure_ignored", { paymentId: payment.id });
      return response({ received: true, ignored: true });
    }

    const result = transaction.status === "success"
      ? await serviceClient.rpc("apply_verified_paystack_payment", {
        p_reference: transaction.reference,
        p_amount_pesewas: transaction.amount,
        p_currency: transaction.currency,
        p_gateway_transaction_id: String(transaction.id),
      })
      : transaction.status === "failed"
        ? await serviceClient.rpc("mark_verified_paystack_payment_failed", {
          p_reference: transaction.reference,
          p_amount_pesewas: transaction.amount,
          p_currency: transaction.currency,
          p_gateway_transaction_id: String(transaction.id),
          p_failure_reason: "Paystack reported a failed transaction.",
        })
        : null;
    if (!result) return response({ received: true, ignored: true });
    const { error } = result;
    if (error) {
      console.error("paystack.webhook_finalization_failed", {
        reference: transaction.reference,
        code: error.code,
      });
      return response({ error: "Verified event could not be applied." }, 503);
    }
    return response({ received: true });
  } catch (error) {
    console.error("paystack.webhook_error", { message: error.message });
    return response({ error: "Webhook processing is temporarily unavailable." }, 500);
  }
});
