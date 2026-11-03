import axios from "axios";

// API Base URL
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error(
    "VITE_API_URL is missing. Please configure it in Vercel environment variables."
  );
}

// Create Axios instance
const api = axios.create({
  baseURL: API_URL || "http://localhost:8000",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach authentication token to requests
api.interceptors.request.use(
  (config) => {
    try {
      const storedUser = localStorage.getItem("pm_copilot_user");

      if (storedUser) {
        const user = JSON.parse(storedUser);

        if (user?.token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch (error) {
      console.error("Error reading user session:", error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Centralized API error handling
api.interceptors.response.use(
  (response) => response,

  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    // Unauthorized
    if (status === 401) {
      localStorage.removeItem("pm_copilot_user");

      if (window.location.pathname !== "/auth/login") {
        window.location.href = "/auth/login";
      }

      return Promise.reject(
        new Error("Session expired. Please log in again.")
      );
    }

    // Forbidden
    if (status === 403) {
      return Promise.reject(
        new Error("You do not have permission to perform this action.")
      );
    }

    // Not Found
    if (status === 404) {
      return Promise.reject(
        new Error(detail || "API endpoint not found.")
      );
    }

    // Validation Error
    if (status === 422) {
      if (Array.isArray(detail)) {
        const messages = detail
          .map((item) => item.msg)
          .filter(Boolean)
          .join(", ");

        return Promise.reject(
          new Error(messages || "Please check your input.")
        );
      }

      return Promise.reject(
        new Error(detail || "Validation error. Check your input.")
      );
    }

    // Server Error
    if (status >= 500) {
      return Promise.reject(
        new Error(detail || "Server error. Please try again later.")
      );
    }

    // Network / CORS / Connection Error
    if (!error.response) {
      return Promise.reject(
        new Error(
          "Cannot connect to the backend. Check the server status and network connection."
        )
      );
    }

    return Promise.reject(error);
  }
);

export default api;
