const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const parseBoolean = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  return normalized === "true" || normalized === "1" || normalized === "yes";
};

const resolveConnectionUrl = () =>
  [process.env.MYSQL_URL, process.env.DATABASE_URL, process.env.DB_URL].find(
    (value) => typeof value === "string" && value.trim()
  ) || "";

const buildConfigFromConnectionUrl = (connectionUrl) => {
  const parsedUrl = new URL(connectionUrl);

  if (!parsedUrl.hostname) {
    throw new Error("Database URL is missing a hostname");
  }

  return {
    host: parsedUrl.hostname,
    user: decodeURIComponent(parsedUrl.username || ""),
    password: decodeURIComponent(parsedUrl.password || ""),
    database: decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, "")),
    port: Number(parsedUrl.port) || 3306,
  };
};

const isSslEnabled = (connectionUrl) => {
  const explicitSslValue = process.env.DB_SSL;

  if (explicitSslValue !== undefined && String(explicitSslValue).trim() !== "") {
    return parseBoolean(explicitSslValue);
  }

  if (!connectionUrl) {
    return false;
  }

  const parsedUrl = new URL(connectionUrl);
  return parseBoolean(parsedUrl.searchParams.get("ssl"));
};

const buildDatabaseConfig = (overrides = {}) => {
  const connectionUrl = resolveConnectionUrl();
  const hasExplicitHost = typeof process.env.DB_HOST === "string" && process.env.DB_HOST.trim();

  if (!connectionUrl && !hasExplicitHost && process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing database configuration. Set MYSQL_URL/DATABASE_URL or DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME."
    );
  }

  const baseConfig = connectionUrl
    ? buildConfigFromConnectionUrl(connectionUrl)
    : {
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "school_db",
        port: Number(process.env.DB_PORT) || 3306,
      };

  return {
    ...baseConfig,
    ...(isSslEnabled(connectionUrl) ? { ssl: { rejectUnauthorized: false } } : {}),
    ...overrides,
  };
};

module.exports = {
  buildDatabaseConfig,
};
