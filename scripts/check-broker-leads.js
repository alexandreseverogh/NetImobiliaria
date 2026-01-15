
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
      SELECT * 
      FROM imovel_prospect_atribuicoes 
      WHERE corretor_fk = $1
      ORDER BY created_at DESC
    `, [brokerId]);

        console.log(`Leads encontrados para corretor ${brokerId}: ${res.rowCount}`);
        console.table(res.rows);
        await pool.end();
    } catch (err) {
        console.error('Erro ao consultar leads:', err);
        await pool.end();
    }
}

checkBrokerLeads();
