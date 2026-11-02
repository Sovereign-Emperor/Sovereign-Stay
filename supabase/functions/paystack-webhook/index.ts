import {
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
    const signature = request.headers.get("x-paystack-signature") ?? "";
    if (!signature || !(await verifyWebhookSignature(rawBody, signature))) {
      return response({ error: "Webhook signature is invalid." }, 401);
    }

    const event = JSON.parse(rawBody);
    if (!["charge.success", "charge.failed"].includes(event.event) ||
      typeof event.data?.reference !== "string") {
      return response({ received: true, ignored: true });
    }
    const transaction = await verifyPaystackReference(event.data.reference);
    if (transaction.reference !== event.data.reference) {
      return response({ received: true, ignored: true });
    }

    const serviceClient = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const result = transaction.status === "success"
      ? await serviceClient.rpc("apply_verified_paystack_payment", {
        p_reference: transaction.reference,
        p_amount_pesewas: transaction.amount,
        p_currency: transaction.currency,
        p_gateway_transaction_id: String(transaction.id),
      })
      : transaction.status === "failed"
        ? await serviceClient.rpc("mark_paystack_payment_failed", {
          p_reference: transaction.reference,
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
