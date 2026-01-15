
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkLatest() {
    const brokerId = '43b2242a-cbea-4696-9e29-3987211188a3';
    try {
        // Check Leads
        const lRes = await pool.query(`
      SELECT prospect_id, status, expira_em, created_at, motivo
      FROM imovel_prospect_atribuicoes 
      WHERE corretor_fk = $1
      ORDER BY created_at DESC 
      LIMIT 3
    `, [brokerId]);
        console.log('--- LEADS RECENTES ---');
        console.log(JSON.stringify(lRes.rows, null, 2));

        // Check Imovel
        const iRes = await pool.query('SELECT id, corretor_fk FROM imoveis WHERE id = 145');
        console.log('\n--- IMOVEL 145 ---');
        console.log(iRes.rows[0]);

        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

checkLatest();
