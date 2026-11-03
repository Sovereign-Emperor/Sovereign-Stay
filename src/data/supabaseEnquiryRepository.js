import { getSupabaseClient } from "./supabaseClient";

async function getClient() {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Supabase enquiry access is not configured.");
  return client;
}

export async function createSupabaseEnquiry(listingId, values, idempotencyKey) {
  const client = await getClient();
  const { data, error } = await client.rpc("submit_listing_enquiry", {
    p_listing_id: listingId,
    p_student_name: values.name.trim(),
    p_student_email: values.email.trim(),
    p_student_phone: values.phone.trim(),
    p_message: values.message.trim(),
    p_viewing_date: values.viewingDate || null,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return data;
}

export async function getSupabaseProviderEnquiries(status = "") {
  const client = await getClient();
  let query = client
    .from("enquiries")
    .select("id, listing_id, property_id, student_user_id, student_name, student_email, student_phone, message, viewing_date, status, created_at, updated_at, listings(id, name, location_summary, properties(name))")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSupabaseProviderEnquiry(id) {
  const client = await getClient();
  const { data, error } = await client
    .from("enquiries")
    .select("id, listing_id, property_id, student_user_id, student_name, student_email, student_phone, message, viewing_date, status, created_at, updated_at, listings(id, name, location_summary, properties(name))")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setSupabaseEnquiryStatus(id, status) {
  const client = await getClient();
  const { data, error } = await client
    .from("enquiries")
    .update({ status })
    .eq("id", id)
    .select("id, status, updated_at")
    .single();
  if (error) throw error;
  return data;
}
