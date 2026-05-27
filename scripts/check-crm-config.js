const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 15432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'postgres'
});

async function run() {
  await client.connect();
  const res = await client.query('SELECT layout_json, form_schema_json FROM crm_segmentos_config WHERE domain_id = 1');
  console.log("LAYOUT_JSON", JSON.stringify(res.rows[0].layout_json, null, 2));
  console.log("FORM_SCHEMA", JSON.stringify(res.rows[0].form_schema_json, null, 2));
  await client.end();
}

run();
