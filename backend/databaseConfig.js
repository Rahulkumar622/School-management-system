const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const isSslEnabled = () => String(process.env.DB_SSL || "").trim().toLowerCase() === "true";

const buildDatabaseConfig = (overrides = {}) => ({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "school_db",
  port: Number(process.env.DB_PORT) || 3306,
  ...(isSslEnabled() ? { ssl: { rejectUnauthorized: false } } : {}),
  ...overrides,
});

module.exports = {
  buildDatabaseConfig,
};
