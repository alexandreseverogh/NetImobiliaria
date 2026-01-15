
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkImoveisTable() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'imoveis'
      ORDER BY column_name;
    `);
        console.log('COLUNAS DA TABELA IMOVEIS:');
        console.table(res.rows);
        await pool.end();
    } catch (err) {
        console.error('Erro ao consultar schema:', err);
        await pool.end();
    }
}

checkImoveisTable();
