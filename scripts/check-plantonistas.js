const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const pool = new Pool({
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function check() {
    try {
        console.log('🔍 Checando estrutura de usuários...');
        
        const res = await pool.query(`
            SELECT id, nome, email, is_plantonista, ativo, tipo_corretor 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 20
        `);
        console.log('--- Últimos 20 usuários ---');
        console.table(res.rows);

        const resP = await pool.query(`
            SELECT id, nome, email, is_plantonista, ativo 
            FROM users 
            WHERE is_plantonista = true OR is_plantonista IS NULL
        `);
        console.log('--- Usuários com is_plantonista true ou NULL ---');
        console.table(resP.rows);

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
