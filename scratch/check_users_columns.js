const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkColumns() {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY column_name");
        console.log('--- COLUNAS DA TABELA USERS ---');
        res.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type}`);
        });
    } catch (e) {
        console.error('Erro ao verificar colunas:', e);
    } finally {
        await pool.end();
    }
}

checkColumns();
