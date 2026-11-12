import { webcrypto } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  isValidPaystackReference,
  matchesPaystackPayment,
  verifyPaystackSignature,
} from "./paystack-validation.ts";

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
});

describe("Paystack validation", () => {
  it("verifies the signature against the exact raw body", async () => {
    const body = '{"event":"charge.success","data":{"reference":"SS-0123456789abcdef0123456789abcdef"}}';
    const secret = "paystack-test-secret";
    const key = await webcrypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const digest = new Uint8Array(
      await webcrypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
    );
    const signature = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");

    await expect(verifyPaystackSignature(body, signature, secret)).resolves.toBe(true);
    await expect(verifyPaystackSignature(`${body} `, signature, secret)).resolves.toBe(false);
    await expect(verifyPaystackSignature(body, "invalid", secret)).resolves.toBe(false);
  });

  it("accepts only the expected payment reference, amount, and currency", () => {
    const reference = "SS-0123456789abcdef0123456789abcdef";
    const transaction = {
      id: 12345,
      reference,
      status: "success",
      amount: 125000,
      currency: "GHS",
    };

    expect(isValidPaystackReference(reference)).toBe(true);
    expect(isValidPaystackReference("../untrusted")).toBe(false);
    expect(matchesPaystackPayment(transaction, reference, 125000, "GHS")).toBe(true);
    expect(matchesPaystackPayment(transaction, reference, 1, "GHS")).toBe(false);
    expect(matchesPaystackPayment(transaction, reference, 125000, "USD")).toBe(false);
    expect(matchesPaystackPayment({ ...transaction, reference: "different" }, reference, 125000, "GHS"))
      .toBe(false);
  });
});
