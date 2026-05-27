const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkRoles() {
    try {
        const res = await pool.query("SELECT id, name, level, is_system_role FROM user_roles ORDER BY level DESC");
        console.log('--- NÍVEIS DE PERFIS NO BANCO ---');
        console.table(res.rows);
    } catch (e) {
        console.error('Erro ao verificar perfis:', e);
    } finally {
        await pool.end();
    }
}

checkRoles();
