import { getSupabaseClient, supabaseConfigError } from "../data/supabaseClient";

async function requireSupabase() {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error(supabaseConfigError || "Supabase authentication is not configured.");
  }
  return supabase;
}

export async function registerWithEmail({ displayName, email, password, accountType = "student" }) {
  const client = await requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        display_name: displayName.trim(),
        account_type: accountType === "provider" ? "provider" : "student",
      },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail({ email, password }) {
  const { data, error } = await (await requireSupabase()).auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function requestPasswordReset(email) {
  const { data, error } = await (await requireSupabase()).auth.resetPasswordForEmail(
    email.trim(),
    { redirectTo: `${window.location.origin}/auth/reset` },
  );
  if (error) throw error;
  return data;
}

export async function updatePassword(password) {
  const { data, error } = await (await requireSupabase()).auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await (await requireSupabase()).auth.signOut();
  if (error) throw error;
}

export async function createProviderBusiness(displayName) {
  const { data, error } = await (await requireSupabase()).rpc("create_provider_business", {
    p_display_name: displayName.trim(),
  });
  if (error) throw error;
  return data;
}

export async function getCurrentProfile(userId) {
  const { data, error } = await (await requireSupabase())
    .from("profiles")
    .select("id, display_name, avatar_path, account_status")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCurrentRoles(userId) {
  const { data, error } = await (await requireSupabase())
    .from("user_roles")
    .select("roles(role_key)")
    .eq("user_id", userId);
  if (error) throw error;
  return data.map(({ roles }) => roles.role_key);
}
