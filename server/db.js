const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  port:               parseInt(process.env.DB_PORT || '3306'),
  database:           process.env.DB_NAME,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
});

module.exports = pool;
