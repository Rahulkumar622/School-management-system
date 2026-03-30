import axios from "axios";

const resolveBaseUrl = () => {
  const configuredUrl = process.env.REACT_APP_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:5000";
    }

    return origin;
  }

  return "";
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
});

export default api;
