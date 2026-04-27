"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";

type UserType = "player" | "admin" | null;

type Player = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  fide_id?: string;
  rating?: number;
};


type Admin = {
  id: string;
  email: string;
  name?: string;
};

type AuthContextType = {
  user: Player | Admin | null;
  userType: UserType;
  loading: boolean;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  userType: null,
  loading: true,
  logout: async () => {},
  refreshAuth: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Player | Admin | null>(null);
  const [userType, setUserType] = useState<UserType>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setUser(null);
        setUserType(null);
        setLoading(false);
        return;
      }

      // Check if player (handle 406 gracefully)
      try {
        const { data: player, error: playerError } = await supabase
          .from("players")
          .select("*")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (player && !playerError) {
          setUser(player as Player);
          setUserType("player");
          setLoading(false);
          return;
        }
      } catch (err) {
        // Ignore 406 errors, continue checking other tables
      }

      // Check if admin (handle 406 gracefully)
      try {
        const { data: admin, error: adminError } = await supabase
          .from("admins")
          .select("*")
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (admin && !adminError) {
          setUser(admin as Admin);
          setUserType("admin");
          setLoading(false);
          return;
        }
      } catch (err) {
        // Not an admin
      }

      // Logged in but not in any table
      setUser(null);
      setUserType(null);
      setLoading(false);
    } catch (error) {
      console.error("Auth check error:", error);
      setUser(null);
      setUserType(null);
      setLoading(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserType(null);
  };

  const refreshAuth = async () => {
    setLoading(true);
    await checkAuth();
  };

  useEffect(() => {
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkAuth();
      } else {
        setUser(null);
        setUserType(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userType, loading, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
