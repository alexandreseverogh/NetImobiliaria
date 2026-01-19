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
      SELECT * FROM status_imovel WHERE id = 99
    `);

        if (res.rows.length === 0) {
            console.log('Status ID 99 não existe.');
        } else {
            console.log('Status ID 99:', res.rows[0]);
            if (res.rows[0].ativo && res.rows[0].consulta_imovel_internauta) {
                console.log('⚠️ Status 99 está MARCADO como visível!');
            } else {
                console.log('✅ Status 99 está excluído da busca (flags corretas).');
            }
        }
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        pool.end();
    }
}

checkStatus();
