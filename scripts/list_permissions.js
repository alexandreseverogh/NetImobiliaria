
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Docker DB (15432)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function listPermissions() {
    try {
        const r = await pool.query('SELECT name FROM permissions ORDER BY name');
        console.log('Permissões existentes:', r.rows.map(p => p.name));
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

listPermissions();
