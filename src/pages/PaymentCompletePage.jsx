import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../data/supabaseClient";

export default function PaymentCompletePage() {
  const [searchParams] = useSearchParams();
  const reference = searchParams.get("reference") || "";
  const [result, setResult] = useState({ status: "checking", message: "" });

  const verify = useCallback(async () => {
    if (!reference) {
      setResult({ status: "error", message: "The payment reference is missing. Do not retry payment from this page." });
      return;
    }

    setResult({ status: "checking", message: "" });
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error("Payment verification is not configured for this application.");
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });
      if (error) throw error;
      if (data?.status === "succeeded") {
        setResult({ status: "succeeded", message: "The server verified the transaction and updated its booking." });
      } else if (data?.status === "pending") {
        setResult({ status: "pending", message: "The gateway has not reported a final status yet. You can check again shortly." });
      } else if (data?.status === "failed") {
        setResult({ status: "failed", message: "The payment was not completed. No booking was marked as paid." });
      } else {
        throw new Error("The verification service returned an unexpected payment status.");
      }
    } catch (cause) {
      setResult({ status: "error", message: cause.message || "Payment status could not be verified. Do not assume the payment succeeded." });
    }
  }, [reference]);

  useEffect(() => { verify(); }, [verify]);

  const Icon = result.status === "succeeded" ? CheckCircle2
    : result.status === "pending" || result.status === "checking" ? Clock3 : XCircle;

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="payment-result-heading" aria-live="polite">
        <p className="provider-eyebrow">PAYMENT STATUS · SERVER VERIFIED</p>
        <Icon size={28} aria-hidden="true" />
        <h1 id="payment-result-heading">{result.status === "checking" ? "Checking transaction" : result.status === "succeeded" ? "Payment confirmed" : result.status === "pending" ? "Payment is pending" : result.status === "failed" ? "Payment not completed" : "Could not verify payment"}</h1>
        <p>{result.message || "The browser redirect is not proof of payment. We are asking the trusted server to verify the transaction with Paystack."}</p>
        {result.status !== "checking" && result.status !== "succeeded" && <button className="provider-outline-button" type="button" onClick={verify}>Check status again</button>}
      </section>
    </main>
  );
}
