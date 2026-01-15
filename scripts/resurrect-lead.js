
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function resurrectLead() {
    const brokerId = '43b2242a-cbea-4696-9e29-3987211188a3';
    const prospectId = 31;

    try {
        const res = await pool.query(`
      UPDATE imovel_prospect_atribuicoes 
      SET status = 'atribuido', 
          expira_em = NOW() + INTERVAL '1 hour',
          motivo = motivo - 'expirado_em'
      WHERE prospect_id = $1 AND corretor_fk = $2
    `, [prospectId, brokerId]);

        console.log(`Lead ${prospectId} reativado para corretor ${brokerId}. Linhas afetadas: ${res.rowCount}`);
        await pool.end();
    } catch (err) {
        console.error('Erro ao atualizar lead:', err);
        await pool.end();
    }
}

resurrectLead();
