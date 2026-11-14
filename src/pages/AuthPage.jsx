import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, KeyRound, LogIn, UserPlus } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  registerWithEmail,
  requestPasswordReset,
  signInWithEmail,
  updatePassword,
} from "../services/authService";
import { useAuth } from "../auth/AuthProvider";

const modes = {
  login: { title: "Welcome back", description: "Sign in to continue to your account." },
  register: { title: "Create your account", description: "Start with an email account. Provider workspaces are created separately." },
  forgot: { title: "Reset your password", description: "We will email a secure password reset link." },
  reset: { title: "Choose a new password", description: "Use a unique password for your account." },
};

function getAuthRequestErrorMessage(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  const isEmailRateLimited =
    error?.status === 429
    || error?.code === "over_email_send_rate_limit"
    || /email rate limit exceeded/i.test(message);

  if (isEmailRateLimited) {
    return "Email sending is temporarily rate-limited. Please wait before trying again. If this continues, contact support.";
  }

  return message || "The account request could not be completed.";
}

export default function AuthPage() {
  const { mode = "login" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const activeMode = modes[mode] ? mode : "login";
  const [values, setValues] = useState({ displayName: "", email: "", password: "", accountType: "student" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const isCallback = location.pathname === "/auth/callback";

  useEffect(() => {
    setPasswordUpdated(false);
  }, [activeMode]);

  useEffect(() => {
    if (isCallback && !auth.loading && auth.user) {
      const destination = auth.user.user_metadata?.account_type === "provider"
        ? "/provider/onboarding"
        : "/";
      navigate(destination, { replace: true });
    }
  }, [auth.loading, auth.user, isCallback, navigate]);

  if (isCallback) {
    return (
      <main className="auth-page">
        <section className="auth-card" aria-live="polite">
          <p className="provider-eyebrow">ACCOUNT CONFIRMATION</p>
          <h1>{auth.loading ? "Checking your confirmation…" : auth.user ? "Email confirmed" : "Confirmation could not finish"}</h1>
          <p>{auth.loading
            ? "We are verifying the secure link with your Supabase project."
            : auth.user
              ? "Your verified account is ready. Continuing to the application."
              : auth.error || "The link may have expired. Return to sign in or request a new email."}</p>
          {!auth.loading && !auth.user && <Link className="provider-outline-button" to="/auth/login">Return to sign in</Link>}
        </section>
      </main>
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (!auth.configured) throw new Error("Supabase authentication is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      if (activeMode === "register") {
        const result = await registerWithEmail(values);
        if (values.accountType === "provider") {
          if (result.session) {
            navigate("/provider/onboarding", { replace: true });
          } else {
            setNotice("Check your email to verify your account, then sign in and complete provider onboarding. Provider access is granted only by the secure onboarding function.");
          }
        } else {
          setNotice(result.session
            ? "Your student account was created, and you are signed in."
            : "Check your email to verify your account before signing in.");
        }
      } else if (activeMode === "login") {
        const result = await signInWithEmail(values);
        const destination = location.state?.from
          || (result.user?.user_metadata?.account_type === "provider" ? "/provider/onboarding" : "/");
        navigate(destination, { replace: true });
      } else if (activeMode === "forgot") {
        await requestPasswordReset(values.email);
        setNotice("If the account exists, a password reset email has been sent.");
      } else if (activeMode === "reset") {
        await updatePassword(values.password);
        setNotice("Your password has been updated. Use the sign-in link when you are ready to continue.");
        setValues((current) => ({ ...current, password: "" }));
        setPasswordUpdated(true);
      }
    } catch (cause) {
      setError(getAuthRequestErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const title = modes[activeMode].title;
  const label = (name, text, type = "text", required = true) => (
    <label className="auth-field" htmlFor={`auth-${name}`}>
      {text}
      <input
        id={`auth-${name}`}
        type={type}
        required={required}
        autoComplete={name === "password" ? (activeMode === "login" ? "current-password" : "new-password") : name === "email" ? "email" : "name"}
        value={values[name]}
        onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
      />
    </label>
  );

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-heading">
        <Link className="auth-back-link" to="/"><ArrowLeft size={15} /> Sovereign Stay</Link>
        <p className="provider-eyebrow">SECURE ACCOUNT · SUPABASE AUTH</p>
        <h1 id="auth-heading">{title}</h1>
        <p>{modes[activeMode].description}</p>
        <p className="auth-demo-note" role="note">
          {auth.configured
            ? "Email verification and session security are managed by your Supabase project. No password is stored by this frontend."
            : "Authentication requires your configured Supabase project. No password is stored by this frontend."}
        </p>
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {!passwordUpdated && <form onSubmit={handleSubmit}>
          {activeMode === "register" && <>
            {label("displayName", "Name")}
            <label className="auth-field" htmlFor="auth-accountType">I am joining as
              <select id="auth-accountType" value={values.accountType} onChange={(event) => setValues((current) => ({ ...current, accountType: event.target.value }))}>
                <option value="student">Student</option>
                <option value="provider">Accommodation provider</option>
              </select>
            </label>
          </>}
          {(activeMode === "login" || activeMode === "register" || activeMode === "forgot") && label("email", "Email address", "email")}
          {(activeMode === "login" || activeMode === "register" || activeMode === "reset") && label("password", activeMode === "login" ? "Password" : "New password", "password")}
          <button className="provider-primary-button auth-submit" type="submit" disabled={busy}>
            {activeMode === "login" ? <LogIn size={16} /> : activeMode === "register" ? <UserPlus size={16} /> : <KeyRound size={16} />}
            {busy ? "Please wait…" : activeMode === "login" ? "Sign in" : activeMode === "register" ? "Create account" : activeMode === "forgot" ? "Send reset link" : "Update password"}
            {!busy && <ArrowRight size={15} />}
          </button>
        </form>}
        <nav className="auth-links" aria-label="Account options">
          {activeMode !== "login" && <Link to="/auth/login">Sign in</Link>}
          {activeMode !== "register" && <Link to="/auth/register">Create account</Link>}
          {activeMode === "login" && <Link to="/auth/forgot">Forgot password?</Link>}
        </nav>
      </section>
    </main>
  );
}
