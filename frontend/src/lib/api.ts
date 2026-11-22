import axios from "axios";

// Central place for the backend base URL.
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || "http://localhost:8080";

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
