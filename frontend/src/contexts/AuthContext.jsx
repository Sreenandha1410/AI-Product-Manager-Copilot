// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../services/api";

const AuthContext = createContext();
const STORAGE_KEY = "pm_copilot_user";

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session on mount ───────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Persist user to localStorage ──────────────────────────
  const persist = (userData) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
  };

  // ── Helpers ───────────────────────────────────────────────
  const buildUser = (data) => ({
    ...data,
    initials: data.name
      ? data.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
      : "U",
  });

  // ── LOGIN ─────────────────────────────────────────────────
  const login = async (email, password, rememberMe = true) => {
    const res      = await api.post("/login", { email, password });
    const userData = buildUser(res.data);
    setUser(userData);
    // Always persist so ProtectedRoute works on refresh
    persist(userData);
    return userData;
  };

  // ── SIGNUP ────────────────────────────────────────────────
  const signup = async (fullName, email, password) => {
    const res      = await api.post("/signup", { name: fullName, email, password });
    const userData = buildUser(res.data);
    setUser(userData);
    persist(userData);
    return userData;
  };

  // ── LOGOUT ────────────────────────────────────────────────
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // ── UPDATE PROFILE ────────────────────────────────────────
  // Called by Settings.jsx after a successful PUT /settings/
  const updateProfile = useCallback((updatedData) => {
    const merged = buildUser({ ...user, ...updatedData });
    setUser(merged);
    persist(merged);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
