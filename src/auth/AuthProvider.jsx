import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getCurrentProfile, getCurrentRoles } from "../services/authService";
import { getSupabaseClient, supabaseConfigured } from "../data/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [roles, setRoles] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(Boolean(supabaseConfigured));
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    let subscription;

    getSupabaseClient().then((supabase) => {
      if (!active) return;
      if (!supabase) {
        setSessionLoading(false);
        return;
      }

      const stateChange = supabase.auth.onAuthStateChange((_event, nextSession) => {
        if (!active) return;
        setSession(nextSession);
        setError("");
        setProfile(null);
        setRoles([]);
        setSessionLoading(false);
      });
      subscription = stateChange.data.subscription;

      return supabase.auth.getSession().then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) setError(sessionError.message);
        setSession(data?.session ?? null);
        setSessionLoading(false);
      });
    }).catch((sessionError) => {
      if (active) {
        setError(sessionError.message || "Could not restore your sign-in session.");
        setSessionLoading(false);
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !supabaseConfigured) {
      setProfile(null);
      setRoles([]);
      setProfileLoading(false);
      return undefined;
    }

    let active = true;
    setProfileLoading(true);
    Promise.all([getCurrentProfile(userId), getCurrentRoles(userId)])
      .then(([nextProfile, nextRoles]) => {
        if (!active) return;
        setProfile(nextProfile);
        setRoles(nextRoles);
      })
      .catch((cause) => {
        if (active) setError(cause.message || "Your account profile could not be loaded.");
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  const value = useMemo(() => ({
    session,
    user: session?.user ?? null,
    profile,
    roles,
    error,
    loading: sessionLoading || profileLoading,
    configured: supabaseConfigured,
    refreshProfile: async () => {
      if (!session?.user?.id) return;
      const [nextProfile, nextRoles] = await Promise.all([
        getCurrentProfile(session.user.id),
        getCurrentRoles(session.user.id),
      ]);
      setProfile(nextProfile);
      setRoles(nextRoles);
    },
  }), [error, profile, profileLoading, roles, session, sessionLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider.");
  return value;
}
