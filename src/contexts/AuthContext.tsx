import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  avatar_url: string | null;
  mobile: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  /** True while the Supabase auth session is being fetched. */
  loading: boolean;
  /** True while public.users row is being fetched after the session resolves. */
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  /**
   * Phase 2.1 fix: an authenticated user whose public.users row was deleted
   * previously ended up with `profile === null`. The old useRBAC fallback then
   * silently elevated them to super_admin. We now:
   *   1. Expose `profileLoading` so RoleProtectedRoute can wait for the fetch
   *      instead of flashing AccessDenied.
   *   2. Sign the user out when the profile row is confirmed missing (not
   *      transient network failure) so they can re-auth and get reprovisioned
   *      rather than drift in an inconsistent state.
   */
  const fetchProfile = async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        // Transient fetch error — keep the user signed in, log, and move on.
        // The next effect run (route change, window focus, etc.) will retry.
        console.error("fetchProfile error", error);
        return;
      }

      if (!data) {
        // Session is valid but there is no matching public.users row — the
        // only safe reaction is to sign out so RLS does not evaluate against
        // a ghost identity.
        console.warn("No public.users row for authenticated session; signing out.");
        setProfile(null);
        await supabase.auth.signOut();
        return;
      }

      setProfile(data as UserProfile);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          setProfileLoading(false);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setProfileLoading(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, profileLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
