const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

async function checkProprietariosColumns() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'proprietarios'
      ORDER BY column_name
    `);
    console.log('--- Colunas na Tabela proprietarios ---');
    console.table(res.rows);

    // Verificar se há dados salvos nos campos semânticos
    const dataRes = await pool.query(`SELECT uuid, nome, corretor_fk, status_fk FROM proprietarios LIMIT 5`);
    console.log('\n--- Dados atuais (Amostra) ---');
    console.table(dataRes.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkProprietariosColumns();
