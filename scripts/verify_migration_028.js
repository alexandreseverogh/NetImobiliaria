
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function verify() {
    try {
        const res = await pool.query("SELECT id, nome, is_plantonista, tipo_corretor FROM users WHERE is_plantonista = true OR tipo_corretor IS NOT NULL LIMIT 5");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

verify();
