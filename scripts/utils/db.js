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

// Adicionar tratamento de erro ao pool para evitar crashes fatais em caso de desconexão (ex.: erro 57P01)
pool.on('error', (err) => {
    console.error('❌ [DB-Utils] Erro inesperado no pool do PostgreSQL:', err.message);
    if (err.code === '57P01') {
        console.warn('⚠️ [DB-Utils] Conexão encerrada pelo administrador. O pool tentará reconectar na próxima requisição.');
    }
});

module.exports = {
    pool,
    getDbConfig
};
