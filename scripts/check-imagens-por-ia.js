const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });

async function run() {
  const r = await pool.query(`
    SELECT id, name, slug, imagens_por_ia
    FROM public.system_segments
    ORDER BY name
  `);
  console.table(r.rows);
  await pool.end();
}
run();
