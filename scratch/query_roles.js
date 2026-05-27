const { Client } = require('pg');
async function run() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
  });
  try {
    await client.connect();
    const res = await client.query("SELECT id, name, is_system_role, tenant_id FROM user_roles WHERE is_system_role = true OR tenant_id IS NULL");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
run();
