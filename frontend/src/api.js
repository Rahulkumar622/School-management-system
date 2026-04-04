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

  let finalUrl;

  if (configuredUrl) {
    finalUrl = configuredUrl.replace(/\/+$/, "");
  } else if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      finalUrl = "http://localhost:5000";
    } else {
      // Prefer a dedicated API host in production when frontend is hosted separately.
      finalUrl = fallbackUrl.replace(/\/+$/, "") || origin;
    }
  } else {
    finalUrl = fallbackUrl.replace(/\/+$/, "") || "http://localhost:5000";
  }

  console.log('[API] Base URL:', finalUrl);
  console.log('[API] REACT_APP_API_URL env:', configuredUrl || 'not set');
  return finalUrl;
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  console.log('[API Request]', config.method?.toUpperCase(), config.baseURL + config.url, config.data);
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
