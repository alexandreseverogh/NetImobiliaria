
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function fixLead30() {
    try {
        const res = await pool.query(`
      UPDATE imovel_prospect_atribuicoes 
      SET status = 'aceito'
      WHERE prospect_id = 30 AND status = 'atribuido'
    `);
        console.log(`Lead 30 atualizado para 'aceito'. Linhas: ${res.rowCount}`);
        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

fixLead30();
