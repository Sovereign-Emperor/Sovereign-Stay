import { getSupabaseClient } from "../data/supabaseClient";

async function getClient() {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Administrator tools need a configured Supabase project.");
  return client;
}

async function callAdminRpc(name, parameters) {
  const client = await getClient();
  const { data, error } = await client.rpc(name, parameters);
  if (error) throw error;
  return data;
}

export async function getAdminDashboardData() {
  const client = await getClient();
  const queries = [
    client.from("listings").select("id, name, status, property_id, created_at, updated_at").order("updated_at", { ascending: false }).limit(100),
    client.from("provider_businesses").select("id, display_name, verification_status, created_at").order("created_at", { ascending: false }).limit(100),
    client.from("properties").select("id, name, verification_status, created_at").order("created_at", { ascending: false }).limit(100),
    client.from("profiles").select("id, display_name, account_status, created_at").order("created_at", { ascending: false }).limit(100),
    client.from("listing_reports").select("id, listing_id, reporter_user_id, reason, message, status, created_at").order("created_at", { ascending: false }).limit(100),
    client.from("reviews").select("id, listing_id, rating, body, status, created_at").order("created_at", { ascending: false }).limit(100),
  ];
  const results = await Promise.all(queries);
  const failed = results.find(({ error }) => error);
  if (failed?.error) throw failed.error;
  const [listings, businesses, properties, profiles, reports, reviews] = results.map(({ data }) => data ?? []);
  return { listings, businesses, properties, profiles, reports, reviews };
}

export function moderateListing(id, decision, reason = "") {
  return callAdminRpc("admin_review_listing", {
    p_listing_id: id,
    p_decision: decision,
    p_reason: reason || null,
  });
}

export function updateBusinessVerification(id, status, reason = "") {
  return callAdminRpc("admin_set_provider_verification", {
    p_provider_business_id: id,
    p_status: status,
    p_reason: reason || null,
  });
}

export function updatePropertyVerification(id, status, reason = "") {
  return callAdminRpc("admin_set_property_verification", {
    p_property_id: id,
    p_status: status,
    p_reason: reason || null,
  });
}

export function resolveListingReport(id, status, note = "") {
  return callAdminRpc("admin_resolve_listing_report", {
    p_report_id: id,
    p_status: status,
    p_resolution_note: note || null,
  });
}

export function moderateReview(id, status, reason = "") {
  return callAdminRpc("admin_moderate_review", {
    p_review_id: id,
    p_status: status,
    p_reason: reason || null,
  });
}

export function updateAccountStatus(id, status, reason) {
  return callAdminRpc("admin_set_account_status", {
    p_user_id: id,
    p_status: status,
    p_reason: reason,
  });
}
