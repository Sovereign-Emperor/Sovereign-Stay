import { useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { isExplicitSupabaseMode } from "../data/supabaseClient";
import { createProviderBusiness } from "../services/authService";

export default function ProviderOnboardingPage() {
  const auth = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!auth.configured || !isExplicitSupabaseMode) {
    return <main className="auth-page"><section className="auth-card"><h1>Provider onboarding unavailable</h1><p>Provider onboarding requires an explicitly configured Supabase mode. The local provider workspace remains separate demonstration functionality.</p></section></main>;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await createProviderBusiness(businessName);
      await auth.refreshProfile();
      setMessage("Provider business created. Provider access is now associated with this signed-in account.");
    } catch (cause) {
      setError(cause.message || "Provider onboarding could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (auth.roles.includes("provider")) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-labelledby="provider-onboarding-heading">
          <p className="provider-eyebrow">PROVIDER ACCOUNT SETUP</p>
          <h1 id="provider-onboarding-heading">Provider access is set up</h1>
          <p className="auth-notice" role="status">Your provider role is recorded by Supabase. Provider listing management is not yet connected to live repositories, so no properties or listings can be managed in this account yet.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="provider-onboarding-heading">
        <p className="provider-eyebrow">PROVIDER ACCOUNT SETUP</p>
        <h1 id="provider-onboarding-heading">Create your provider workspace</h1>
        <p>Business ownership and provider role are assigned together by the database after checking your verified session. Administrator access cannot be requested here.</p>
        {message && <p className="auth-notice" role="status">{message}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <form onSubmit={handleSubmit}>
          <label className="auth-field" htmlFor="provider-business-name">Business or provider display name
            <input id="provider-business-name" minLength={2} maxLength={160} required value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
          </label>
          <button className="provider-primary-button auth-submit" disabled={busy}>{busy ? "Creating workspace…" : "Create provider workspace"}</button>
        </form>
      </section>
    </main>
  );
}
