const mysql = require('mysql2/promise');

// A connection pool, not a single connection: Express handles many requests
// concurrently, and each in-flight query needs its own MySQL connection.
// The pool hands one out per query and returns it when done, instead of
// every request fighting over a single shared connection.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
