export interface PaystackTransaction {
  id: number;
  reference: string;
  status: string;
  amount: number;
  currency: string;
}

export type PaystackTransactionOutcome = "succeeded" | "failed" | "pending" | "unknown";

export function isPaystackInitiationEnabled(value: string | undefined) {
  return value === "true";
}

export function classifyPaystackTransactionStatus(status: string): PaystackTransactionOutcome {
  if (status === "success") return "succeeded";
  if (status === "failed" || status === "abandoned") return "failed";
  if (["pending", "ongoing", "processing", "queued"].includes(status)) return "pending";
  return "unknown";
}

export function isValidPaystackReference(reference: unknown): reference is string {
  return typeof reference === "string" && /^SS-[0-9a-f]{32}$/i.test(reference);
}

export function matchesPaystackPayment(
  transaction: PaystackTransaction,
  reference: string,
  amountPesewas: number,
  currency: string,
) {
  return Number.isSafeInteger(amountPesewas) &&
    amountPesewas > 0 &&
    Number.isSafeInteger(transaction.id) &&
    transaction.id > 0 &&
    transaction.reference === reference &&
    Number.isSafeInteger(transaction.amount) &&
    transaction.amount > 0 &&
    transaction.amount === amountPesewas &&
    transaction.currency === currency;
}

export async function verifyPaystackSignature(
  rawBody: string | Uint8Array,
  signature: string,
  secret: string,
) {
  if (!/^[0-9a-f]{128}$/i.test(signature)) return false;
  const signatureBytes = new Uint8Array(64);
  for (let index = 0; index < signatureBytes.length; index += 1) {
    signatureBytes[index] = Number.parseInt(signature.slice(index * 2, index * 2 + 2), 16);
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["verify"],
  );
  const bodyBytes = typeof rawBody === "string" ? new TextEncoder().encode(rawBody) : rawBody;
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    bodyBytes,
  );
}
