
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
});

async function checkSchema() {
    try {
        const tables = ['imovel_prospects', 'imoveis', 'proprietarios', 'users', 'imovel_prospect_atribuicoes', 'email_templates'];
        for (const table of tables) {
            console.log(`\n--- Table: ${table} ---`);
            const res = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table}'
      `);
            res.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type}`));
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSchema();
