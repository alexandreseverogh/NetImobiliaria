
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

async function inspectCatStructure() {
    try {
        const r = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'system_categorias';
    `);
        console.table(r.rows);

        // Check content without ordering if possible
        const r2 = await pool.query("SELECT * FROM system_categorias LIMIT 5");
        console.log("Sample rows:");
        console.table(r2.rows);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

inspectCatStructure();
