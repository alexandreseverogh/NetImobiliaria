
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function inspectPerms() {
    try {
        const r = await pool.query(`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'permissions';
    `);
        console.log('Colunas permissions:', r.rows.map(c => c.column_name));

        // Also check 1 row content
        const r2 = await pool.query('SELECT * FROM permissions LIMIT 1');
        if (r2.rows.length > 0) {
            console.log('Sample row:', r2.rows[0]);
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

inspectPerms();
