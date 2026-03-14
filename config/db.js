const { Pool } = require('pg');
require('dotenv').config(); // This loads the variables from your .env file

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

pool.connect()
  .then(() => console.log('✅ Successfully connected to the PostgreSQL database!'))
  .catch((err) => console.error('❌ Database connection error:', err.stack));

module.exports = pool;