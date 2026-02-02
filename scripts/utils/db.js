/**
 * DB Utils Helper
 * Centralizes database connection configuration for all Node.js scripts.
 */
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

function getDbConfig() {
    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '15432', 10);
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';
    const database = process.env.DB_NAME || 'net_imobiliaria';

    console.log(`🔌 [DB-Utils] Connecting to ${database} on ${host}:${port}`);

    return {
        host,
        port,
        user,
        password,
        database,
        // Add reasonable timeouts to prevent hanging during error flood
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000,
        max: 10
    };
}

const pool = new Pool(getDbConfig());

module.exports = {
    pool,
    getDbConfig
};
