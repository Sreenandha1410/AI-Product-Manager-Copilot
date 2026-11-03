```javascript
import axios from "axios";

// API Base URL
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error("VITE_API_URL environment variable is missing.");
}

const api = axios.create({
  baseURL: API_URL || "http://localhost:8000",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach authentication token
api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem("pm_copilot_user");

      if (stored) {
        const user = JSON.parse(stored);

        if (user?.token) {
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

// Centralized error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    if (status === 401) {
      localStorage.removeItem("pm_copilot_user");
      window.location.href = "/auth/login";

      return Promise.reject(
        new Error("Session expired. Please log in again.")
      );
    }

    if (status === 403) {
      return Promise.reject(
        new Error("You do not have permission to perform this action.")
      );
    }

    if (status === 404) {
      return Promise.reject(
        new Error(detail || "API endpoint not found.")
      );
    }

    if (status === 422) {
      const messages = error.response?.data?.detail;

      if (Array.isArray(messages)) {
        return Promise.reject(
          new Error(messages.map((item) => item.msg).join(", "))
        );
      }
    }

    if (status >= 500) {
      return Promise.reject(
        new Error(detail || "Server error. Please try again.")
      );
    }

    if (!error.response) {
      return Promise.reject(
        new Error("Cannot connect to the backend server.")
      );
    }

    return Promise.reject(error);
  }
);

export default api;
```
