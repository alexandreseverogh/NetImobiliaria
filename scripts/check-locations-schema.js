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
        console.log('=== Imoveis FK Columns ===');
        const imoveisCols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' 
      AND column_name LIKE '%fk%'
    `);
        console.table(imoveisCols.rows);

        console.log('\n=== Possible Location Tables ===');
        const locTables = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('estado', 'estados', 'cidade', 'cidades', 'municipio', 'municipios')
      ORDER BY table_name, ordinal_position
    `);
        console.table(locTables.rows);

        await pool.end();
    } catch (err) {
        console.error(err);
        await pool.end();
    }
}

checkSchema();
