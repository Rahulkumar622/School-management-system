const mysql = require("mysql2");

const { buildDatabaseConfig } = require("./databaseConfig");

const db = mysql.createPool(
  buildDatabaseConfig({
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0,
  })
);

db.getConnection((error, connection) => {
  if (error) {
    console.log("Database connection failed", error);
    return;
  }

  console.log("MySQL connected");
  connection.release();
});

module.exports = db;
