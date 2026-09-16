const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });

async function check() {
  const { rows: tenants } = await pool.query(`SELECT id, name, segment_id FROM public.tenants WHERE name ILIKE '%Marketing Digital%'`);
  console.log(tenants);
  const { rows: segs } = await pool.query(`SELECT * FROM public.system_segments WHERE id = $1`, [tenants[0].segment_id]);
  console.log(segs);
  await pool.end();
}
check();
