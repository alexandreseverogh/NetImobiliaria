const { Client } = require('pg');

async function main() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432
  });

  try {
    await client.connect();
    const res = await client.query("SELECT pg_get_functiondef('get_sidebar_menu_for_user(uuid, text, uuid)'::regprocedure)");
    console.log(res.rows[0].pg_get_functiondef);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
