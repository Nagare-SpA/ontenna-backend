import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: UserRole[];
  isLoading: boolean;
  isVerified: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ user: User | null; error: Error | null; alreadyExists: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  sendVerificationCode: () => Promise<{ error: Error | null }>;
  verifyCode: (code: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    return data;
  };

  const fetchRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching roles:", error);
      return [];
    }
    return data || [];
  };

  const refreshProfile = async () => {
    if (user) {
      const [profileData, rolesData] = await Promise.all([
        fetchProfile(user.id),
        fetchRoles(user.id),
      ]);
      setProfile(profileData);
      setRoles(rolesData);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Use setTimeout to avoid potential race conditions
          setTimeout(async () => {
            const [profileData, rolesData] = await Promise.all([
              fetchProfile(session.user.id),
              fetchRoles(session.user.id),
            ]);
            setProfile(profileData);
            setRoles(rolesData);
            setIsProfileLoaded(true);
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setIsProfileLoaded(true);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        Promise.all([
          fetchProfile(session.user.id),
          fetchRoles(session.user.id),
        ]).then(([profileData, rolesData]) => {
          setProfile(profileData);
          setRoles(rolesData);
          setIsProfileLoaded(true);
          setIsLoading(false);
        });
      } else {
        setIsProfileLoaded(true);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: firstName,
          last_name: lastName,
          account_type: "end_user",
        },
      },
    });

    if (error) {
      const alreadyExists = /already registered|already exists|user already/i.test(error.message);
      return { user: null, error, alreadyExists };
    }

    // When email confirmations are enabled, Supabase returns an obfuscated user
    // with an empty `identities` array if the email already exists (anti-enumeration).
    const identities = (data.user as { identities?: unknown[] } | null)?.identities;
    const alreadyExists = !!data.user && Array.isArray(identities) && identities.length === 0;
    if (alreadyExists) {
      return { user: null, error: null, alreadyExists: true };
    }

    return { user: data.user, error: null, alreadyExists: false };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const sendVerificationCode = async (overrideUserId?: string, overrideEmail?: string, overrideFirstName?: string) => {
    const userId = overrideUserId || user?.id;
    const email = overrideEmail || user?.email;
    const firstName = overrideFirstName || profile?.first_name;

    if (!userId || !email) {
      return { error: new Error("No user data available") };
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
      };

      // Add auth token if available
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-verification-code`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            userId,
            email,
            firstName,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { error: new Error(data.error || "Failed to send code") };
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const verifyCode = async (code: string) => {
    if (!user) {
      return { error: new Error("No user logged in") };
    }

    try {
      const response = await fetch(
        "https://ycfrjvnuepfkeffsqxgm.supabase.co/functions/v1/verify-code",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { error: new Error(data.error || "Failed to verify code") };
      }

      // Refresh profile to get updated verification status
      await refreshProfile();

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const isVerified = profile?.is_verified ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        roles,
        isLoading,
        isVerified,
        signUp,
        signIn,
        signOut,
        sendVerificationCode,
        verifyCode,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
