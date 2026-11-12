import {
  authenticateUser,
  checkBrowserOrigin,
  isValidPaystackReference,
  requireEnvironment,
  response,
} from "../_shared/paystack.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? undefined;
  if (request.method === "OPTIONS") {
    return checkBrowserOrigin(request) ?? response({}, 200, origin);
  }
  if (request.method !== "POST") return response({ error: "Method not allowed." }, 405, origin);
  const originError = checkBrowserOrigin(request);
  if (originError) return originError;

  try {
    const [appOrigin, paystackSecret] = requireEnvironment("APP_ORIGIN", "PAYSTACK_SECRET_KEY");
    const { user, userClient, serviceClient } = await authenticateUser(request);
    let body;
    try {
      body = await request.json();
    } catch {
      return response({ error: "Request body must be valid JSON." }, 400, origin);
    }
    if (!body || typeof body !== "object") {
      return response({ error: "A valid booking and idempotency key are required." }, 400, origin);
    }
    if (!UUID_PATTERN.test(body.bookingId ?? "") || !UUID_PATTERN.test(body.idempotencyKey ?? "")) {
      return response({ error: "A valid booking and idempotency key are required." }, 400, origin);
    }

    const { data: payment, error: paymentError } = await userClient.rpc("begin_booking_payment", {
      p_booking_id: body.bookingId,
      p_idempotency_key: body.idempotencyKey,
    });
    if (paymentError || !payment) {
      console.error("paystack.payment_attempt_rejected", { code: paymentError?.code });
      return response({ error: "Payment could not be started for this booking." }, 409, origin);
    }
    if (payment.currency !== "GHS" || !Number.isSafeInteger(payment.amount_pesewas) ||
      payment.amount_pesewas <= 0 || !isValidPaystackReference(payment.reference)) {
      return response({ error: "The booking returned invalid payment details." }, 409, origin);
    }
    if (payment.status === "pending" && payment.authorization_url) {
      return response({
        authorizationUrl: payment.authorization_url,
        reference: payment.reference,
        amountPesewas: payment.amount_pesewas,
        currency: payment.currency,
      }, 200, origin);
    }
    if (payment.status !== "initializing") {
      return response({ error: "This payment attempt cannot be initialized again." }, 409, origin);
    }

    const rawPaymentPercent = Deno.env.get("PAYMENT_AMOUNT_PERCENT") ?? "100";
    if (!/^(?:[1-9]\d?|100)$/.test(rawPaymentPercent)) {
      const { error: failureError } = await serviceClient.rpc("mark_paystack_initialization_failed", {
        p_payment_id: payment.id,
        p_failure_reason: "Server payment amount policy is invalid.",
      });
      if (failureError) console.error("paystack.payment_policy_failure_record_failed", { paymentId: payment.id });
      return response({ error: "The server payment amount policy is invalid." }, 500, origin);
    }
    const { data: amountPesewas, error: amountError } = await serviceClient.rpc(
      "configure_booking_payment_amount",
      {
        p_payment_id: payment.id,
        p_student_user_id: user.id,
        p_payment_percent: Number(rawPaymentPercent),
      },
    );
    if (amountError || !Number.isSafeInteger(amountPesewas) || amountPesewas <= 0) {
      console.error("paystack.payment_amount_policy_failed", { paymentId: payment.id });
      const { error: failureError } = await serviceClient.rpc("mark_paystack_initialization_failed", {
        p_payment_id: payment.id,
        p_failure_reason: "Configured payment amount could not be applied.",
      });
      if (failureError) console.error("paystack.payment_policy_failure_record_failed", { paymentId: payment.id });
      return response({ error: "The configured payment amount could not be applied." }, 409, origin);
    }

    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountPesewas,
        currency: "GHS",
        reference: payment.reference,
        callback_url: `${appOrigin}/payment/complete`,
        metadata: { booking_id: body.bookingId, payment_id: payment.id },
      }),
    });
    const gateway = await paystackResponse.json();
    const authorizationUrl = gateway?.data?.authorization_url;
    let checkoutHost = "";
    try {
      checkoutHost = new URL(authorizationUrl).hostname;
    } catch {
      checkoutHost = "";
    }
    if (!paystackResponse.ok || !gateway?.status || !authorizationUrl ||
      checkoutHost !== "checkout.paystack.com") {
      console.error("paystack.initialization_failed", { paymentId: payment.id, status: paystackResponse.status });
      const { error: failureError } = await serviceClient.rpc("mark_paystack_initialization_failed", {
        p_payment_id: payment.id,
        p_failure_reason: "Paystack did not return a valid checkout session.",
      });
      if (failureError) {
        console.error("paystack.initialization_failure_record_failed", { paymentId: payment.id });
      }
      return response({ error: "Paystack could not initialize this payment. No booking was marked as paid." }, 502, origin);
    }

    const { error: saveError } = await serviceClient.rpc("complete_paystack_initialization", {
      p_payment_id: payment.id,
      p_authorization_url: authorizationUrl,
    });
    if (saveError) {
      console.error("paystack.authorization_url_save_failed", { paymentId: payment.id });
      return response({ error: "The payment was initialized but its checkout link could not be saved. Contact support before retrying." }, 503, origin);
    }

    return response({
      authorizationUrl,
      reference: payment.reference,
      amountPesewas,
      currency: payment.currency,
    }, 200, origin);
  } catch (error) {
    console.error("paystack.initiation_error", { message: error.message });
    const status = error.message.includes("signed-in user") ? 401 : 500;
    return response({ error: status === 401 ? error.message : "Payment initialization is temporarily unavailable." }, status, origin);
  }
});
