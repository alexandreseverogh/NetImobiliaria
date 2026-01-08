
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function listCats() {
    try {
        const r = await pool.query("SELECT id, name FROM system_categorias ORDER BY id");
        console.log("Categorias:", r.rows);
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

listCats();
