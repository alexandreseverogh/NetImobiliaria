const { Pool } = require('pg');
const pool = new Pool({
  host: '127.0.0.1',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'net_imobiliaria'
});

async function main() {
  const imovelRes = await pool.query('SELECT id FROM imoveis WHERE ativo = true LIMIT 1');
  const clienteRes = await pool.query('SELECT uuid FROM clientes LIMIT 1');
  console.log('TEST_DATA_START');
  console.log(JSON.stringify({
    imovelId: imovelRes.rows[0]?.id,
    clienteUuid: clienteRes.rows[0]?.uuid
  }));
  console.log('TEST_DATA_END');
  process.exit(0);
}
main();
