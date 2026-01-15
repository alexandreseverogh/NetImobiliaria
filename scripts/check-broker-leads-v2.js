
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkBrokerLeads() {
    const brokerId = '43b2242a-cbea-4696-9e29-3987211188a3';
    try {
        const res = await pool.query(`
      SELECT prospect_id, status, expira_em, created_at, motivo 
      FROM imovel_prospect_atribuicoes 
      WHERE corretor_fk = $1
      ORDER BY created_at DESC
    `, [brokerId]);

        console.log(`Leads encontrados: ${res.rowCount}`);
        console.log(JSON.stringify(res.rows, null, 2));
        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

checkBrokerLeads();
