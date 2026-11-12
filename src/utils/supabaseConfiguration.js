const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export function validateSupabaseConfiguration(
  urlValue,
  publicKeyValue,
  { allowLocalHttp = false } = {},
) {
  const url = typeof urlValue === "string" ? urlValue.trim() : "";
  const publicKey = typeof publicKeyValue === "string" ? publicKeyValue.trim() : "";

  if (!url && !publicKey) {
    return "Supabase URL and public anon/publishable key are not configured.";
  }
  if (!url) return "The Supabase project URL is missing.";
  if (!publicKey) return "The Supabase public anon/publishable key is missing.";

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return "The Supabase project URL is invalid.";
  }

  if (parsedUrl.username || parsedUrl.password || parsedUrl.search || parsedUrl.hash) {
    return "The Supabase project URL must not contain credentials, query parameters, or a fragment.";
  }

  const isLocalHttp = allowLocalHttp &&
    parsedUrl.protocol === "http:" &&
    LOCAL_HOSTNAMES.has(parsedUrl.hostname);
  if (parsedUrl.protocol !== "https:" && !isLocalHttp) {
    return "Use an HTTPS Supabase project URL; HTTP is allowed only for local development.";
  }

  return "";
}

export function isPaymentFeatureEnabled(dataMode, publicFlag) {
  return dataMode === "supabase" && publicFlag === "true";
}
