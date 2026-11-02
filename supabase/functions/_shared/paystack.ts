import { createClient } from "https://esm.sh/@supabase/supabase-js@2.118.0";

const jsonHeaders = { "Content-Type": "application/json" };

export function response(body: Record<string, unknown>, status = 200, origin?: string) {
  const headers = new Headers(jsonHeaders);
  if (origin && origin === Deno.env.get("APP_ORIGIN")) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-request-id");
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export function checkBrowserOrigin(request: Request) {
  const expected = Deno.env.get("APP_ORIGIN");
  const actual = request.headers.get("origin");
  if (!expected || !actual || actual !== expected) {
    return response({ error: "Request origin is not allowed." }, 403, actual ?? undefined);
  }
  return null;
}

export function requireEnvironment(...names: string[]) {
  const values = names.map((name) => Deno.env.get(name));
  if (values.some((value) => !value)) {
    throw new Error("A required server secret is not configured.");
  }
  return values as string[];
}

export async function authenticateUser(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Error("A signed-in user session is required.");
  }
  const [url, anonKey, serviceRoleKey] = requireEnvironment(
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user?.email) {
    throw new Error("The signed-in user could not be verified.");
  }
  const serviceClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { user: data.user, userClient, serviceClient };
}

export async function verifyPaystackReference(reference: string) {
  const [secret] = requireEnvironment("PAYSTACK_SECRET_KEY");
  const result = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` } },
  );
  if (!result.ok) throw new Error("Paystack could not verify the transaction.");
  const body = await result.json();
  if (!body.status || !body.data) {
    throw new Error("Paystack returned an invalid verification response.");
  }
  return body.data as {
    id: number;
    reference: string;
    status: string;
    amount: number;
    currency: string;
  };
}

export async function verifyWebhookSignature(rawBody: string, signature: string) {
  const [secret] = requireEnvironment("PAYSTACK_SECRET_KEY");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)),
  );
  const expected = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (signature.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) {
    mismatch |= signature.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}
