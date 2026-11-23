import axios from "axios";

// Central place for the backend base URL. Strip any trailing slash if present.
const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080";
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT to every outgoing request automatically.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Handle 401 Unauthorized responses (token expired / revoked)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || "";
      // Don't auto-redirect on login/register attempt failures so user sees the validation error message
      const isAuthEndpoint = url.includes("/api/auth/login") || url.includes("/api/auth/register");
      if (!isAuthEndpoint) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
