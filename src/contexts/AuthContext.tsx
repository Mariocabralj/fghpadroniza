import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User as SupaUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  name: string;
  role: string;
  email: string;
  sector: string;
  initials: string;
  user_id: string;
}

interface AuthContextType {
  user: Profile | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, data: { name: string; role: string; sector: string }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("") || "U";

async function loadProfile(supaUser: SupaUser): Promise<Profile> {
  const { data } = await supabase
    .from("profiles")
    .select("name, role, sector, email")
    .eq("user_id", supaUser.id)
    .maybeSingle();
  const name = data?.name || supaUser.email?.split("@")[0] || "Usuário";
  return {
    name,
    role: data?.role || "",
    sector: data?.sector || "",
    email: data?.email || supaUser.email || "",
    initials: initials(name),
    user_id: supaUser.id,
  };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => {
          loadProfile(sess.user).then(setUser);
          checkAdmin(sess.user.id);
        }, 0);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      if (sess?.user) {
        setUser(await loadProfile(sess.user));
        await checkAdmin(sess.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("status")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (prof?.status === "blocked") {
        await supabase.auth.signOut();
        return { error: "Sua conta foi bloqueada. Contate o administrador." };
      }
    }
    return {};
  };

  const signUp = async (
    email: string,
    password: string,
    data: { name: string; role: string; sector: string }
  ) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl, data },
    });
    return error ? { error: error.message } : {};
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (session?.user) setUser(await loadProfile(session.user));
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signIn, signUp, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
