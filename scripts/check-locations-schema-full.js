const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkSchema() {
    try {
        console.log('=== Imoveis ALL Columns ===');
        const res = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'imoveis'
      ORDER BY column_name
    `);
        console.log(JSON.stringify(res.rows.map(r => r.column_name), null, 2));

        console.log('\n=== All Tables ===');
        const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
        console.log(JSON.stringify(tables.rows.map(r => r.table_name), null, 2));

        await pool.end();
    } catch (err) {
        console.error(err);
        await pool.end();
    }
}

checkSchema();
