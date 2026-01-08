
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

async function inspectCols() {
    try {
        const r = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sidebar_menu_items'
    `);
        console.log(r.rows.map(x => x.column_name));
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

inspectCols();
