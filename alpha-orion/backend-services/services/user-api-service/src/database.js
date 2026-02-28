const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pgPool.on('error', (err, client) => {
  logger.error({ err, client }, 'Unexpected error on idle PostgreSQL client');
  process.exit(-1);
});

const connectToDB = async () => {
  try {
    // The pool will establish connections as they are needed.
    // This is a good place to run a single query to check the connection.
    await pgPool.query('SELECT NOW()');
    logger.info('Successfully connected to PostgreSQL');

    // Initialize Schema and Indexes
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pgPool.query(schemaSql);
      logger.info('Database schema and indexes verified');
    }
  } catch (e) {
    logger.error({ err: e }, 'Failed to connect to PostgreSQL on startup.');
  }
};

module.exports = { pgPool, connectToDB };