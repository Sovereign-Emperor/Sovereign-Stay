import {
  isPaymentFeatureEnabled,
  validateSupabaseConfiguration,
} from "../utils/supabaseConfiguration";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const supabaseConfigError = validateSupabaseConfiguration(
  supabaseUrl,
  supabaseAnonKey,
  { allowLocalHttp: import.meta.env.DEV },
);
export const supabaseConfigured = !supabaseConfigError;

export const isExplicitDemoMode = import.meta.env.VITE_DATA_MODE === "demo";
export const isExplicitSupabaseMode = import.meta.env.VITE_DATA_MODE === "supabase";
export const paymentCheckoutEnabled = isPaymentFeatureEnabled(
  import.meta.env.VITE_DATA_MODE,
  import.meta.env.VITE_PAYMENTS_ENABLED,
);

let clientPromise;

/** Load the authentication SDK only when an account feature is opened. */
export function getSupabaseClient() {
  if (!supabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true,
        },
      }),
    );
  }
  return clientPromise;
}
