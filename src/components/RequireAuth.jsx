import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import {
  isExplicitDemoMode,
  isExplicitSupabaseMode,
} from "../data/supabaseClient";

export default function RequireAuth({ children, role }) {
  const auth = useAuth();
  const location = useLocation();

  if (isExplicitDemoMode) return children;
  if (import.meta.env.DEV && !isExplicitSupabaseMode && !auth.configured) return children;
  if (auth.loading) return <main className="auth-page" role="status">Checking your account…</main>;
  if (auth.error) {
    return <main className="auth-page" role="alert"><section className="auth-card"><h1>Account access could not be checked</h1><p>{auth.error}</p></section></main>;
  }
  if (!auth.user) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }
  if (auth.profile?.account_status !== "active") {
    return <main className="auth-page" role="alert"><h1>Account access is paused</h1><p>Contact support if you believe this is a mistake.</p></main>;
  }
  if (role && !auth.roles.includes(role)) {
    return <Navigate to={role === "provider" ? "/provider/onboarding" : "/"} replace />;
  }
  return children;
}
