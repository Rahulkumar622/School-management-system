import axios from "axios";
import {
  clearAdminSession,
  clearParentSession,
  clearStudentSession,
  clearTeacherSession,
  getAuthToken,
} from "./session";

const resolveBaseUrl = () => {
  const configuredUrl = process.env.REACT_APP_API_URL?.trim();
  const fallbackUrl =
    process.env.REACT_APP_FALLBACK_API_URL?.trim() ||
    "https://school-management-system-production-708f.up.railway.app";

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }

    // Prefer a dedicated API host in production when frontend is hosted separately.
    return fallbackUrl.replace(/\/+$/, "") || origin;
  }

  return fallbackUrl.replace(/\/+$/, "") || "http://localhost:5000";
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const statusCode = error?.response?.status;
    const requestUrl = String(error?.config?.url || "");
    const isLoginRequest =
      requestUrl.includes("/admin-login") ||
      requestUrl.includes("/student-login") ||
      requestUrl.includes("/teacher-login") ||
      requestUrl.includes("/parent-login");

    if (typeof window !== "undefined" && statusCode === 401 && !isLoginRequest) {
      clearAdminSession();
      clearParentSession();
      clearStudentSession();
      clearTeacherSession();

      if (window.location.pathname !== "/") {
        window.location.assign("/");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
