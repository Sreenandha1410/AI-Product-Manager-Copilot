// src/services/api.js
import axios from "axios";

// ── Base instance ─────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  timeout: 60000,   // 60 s — LLM calls can be slow
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor — attach token if present ─────────────
api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem("pm_copilot_user");
      if (stored) {
        const user = JSON.parse(stored);
        if (user?.token) {
          config.headers["Authorization"] = `Bearer ${user.token}`;
        }
      }
    } catch {
      // ignore parse errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — centralised error handling ─────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const detail  = error.response?.data?.detail;

    if (status === 401) {
      // Token expired or invalid — clear session and redirect
      localStorage.removeItem("pm_copilot_user");
      window.location.href = "/auth/login";
      return Promise.reject(new Error("Session expired. Please log in again."));
    }

    if (status === 403) {
      return Promise.reject(new Error("You do not have permission to perform this action."));
    }

    if (status === 404) {
      return Promise.reject(new Error(detail ?? "Resource not found."));
    }

    if (status === 422) {
      // FastAPI validation error
      const msgs = error.response?.data?.detail;
      if (Array.isArray(msgs)) {
        const combined = msgs.map(m => m.msg).join(", ");
        return Promise.reject(new Error(combined));
      }
      return Promise.reject(new Error("Validation error. Check your input."));
    }

    if (status >= 500) {
      return Promise.reject(
        new Error(detail ?? "Server error. Please try again or contact support.")
      );
    }

    // Network / timeout error
    if (!error.response) {
      return Promise.reject(
        new Error("Cannot connect to the server. Make sure the backend is running.")
      );
    }

    return Promise.reject(error);
  }
);

export default api;
