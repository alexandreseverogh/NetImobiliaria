
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function debugSchema() {
  const client = new Client({
    host: 'localhost',
    port: 15432,
    user: 'postgres',
    password: 'postgres',
    database: 'net_imobiliaria',
  });

  try {
    await client.connect();
    console.log('--- DEBUG SCHEMA: feed.feed_conteudos ---');
    const res = await client.query(`
      SELECT column_name, column_default, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'feed' 
        AND table_name = 'feed_conteudos'
    `);
    console.table(res.rows);
    
    // Verificar contagem por status ativo
    const res2 = await client.query('SELECT ativo, count(*) FROM feed.feed_conteudos GROUP BY ativo');
    console.log('Contagem por status ativo:');
    console.table(res2.rows);

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await client.end();
  }
}

debugSchema();
