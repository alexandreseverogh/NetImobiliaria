import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'net_imobiliaria'
});

async function run() {
  const userId = 'cc8220f7-a3fd-40ed-8dbd-a22539328083'; // Super Admin
  const sysId = 'admin';

  try {
    const tenantId = '7d8f29a9-5049-49e2-a0d3-efed44b833bc';
    const query = 'SELECT get_sidebar_menu_for_user($1::uuid, $2, $3::uuid) AS menu';
    const result = await pool.query(query, [userId, sysId, tenantId]);
    console.log(JSON.stringify(result.rows[0].menu, null, 2));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
run();
