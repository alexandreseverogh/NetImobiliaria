require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
});

async function checkOiapoque() {
    try {
        const res = await pool.query(`
      SELECT count(*) 
      FROM imoveis i
      JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      JOIN status_imovel si ON i.status_fk = si.id
      WHERE i.cidade_fk = 'Oiapoque' 
      AND i.ativo = true
      AND si.ativo = true
      AND si.consulta_imovel_internauta = true
      AND (fi.vender_landpaging = true OR fi.alugar_landpaging = true)
    `);

        console.log('Public properties in Oiapoque:', res.rows[0].count);
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        pool.end();
    }
}

checkOiapoque();
