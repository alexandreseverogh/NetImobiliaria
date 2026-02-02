const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function run() {
    const q = `
    SELECT
      i.id as imovel_id,
      i.codigo
    FROM public.imovel_prospect_atribuicoes a
    INNER JOIN public.imovel_prospects ip ON ip.id = a.prospect_id
    INNER JOIN public.imoveis i ON ip.id_imovel = i.id
    LIMIT 2
  `;
    const r = await pool.query(q);
    console.log('API SQL Result:', r.rows);
    pool.end();
}
run();
