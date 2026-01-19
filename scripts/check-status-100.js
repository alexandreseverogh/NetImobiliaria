require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
});

async function checkStatus() {
    try {
        const res = await pool.query(`
      SELECT * FROM status_imovel WHERE id = 100
    `);

        if (res.rows.length === 0) {
            console.log('Status ID 100 não existe.');
        } else {
            console.log('Status ID 100:', res.rows[0]);
        }
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        pool.end();
    }
}

checkStatus();
