const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

async function validateTag() {
  try {
    console.log('--- Configuração da Tag no Dicionário ---');
    const tagRes = await pool.query("SELECT * FROM system_role_tags WHERE tag_key ILIKE '%STATUS%'");
    console.table(tagRes.rows);

    if (tagRes.rows.length > 0) {
      const tag = tagRes.rows[0];
      console.log(`\n--- Testando Tabela: ${tag.source_table} ---`);
      
      // Verificar se a tabela existe
      const tableCheck = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_name = $1", [tag.source_table]);
      if (tableCheck.rows.length === 0) {
        console.error(`❌ ERRO: A tabela '${tag.source_table}' NÃO EXISTE no banco de dados!`);
        return;
      }

      // Verificar colunas
      const colsRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = $1", [tag.source_table]);
      console.log('Colunas encontradas:', colsRes.rows.map(c => c.column_name).join(', '));

      // Verificar dados
      const dataRes = await pool.query(`SELECT * FROM ${tag.source_table} LIMIT 5`);
      console.log('\n--- Primeiros 5 registros da tabela ---');
      console.table(dataRes.rows);
    } else {
      console.error('❌ ERRO: Nenhuma Tag encontrada com o termo "STATUS".');
    }

  } catch (err) {
    console.error('❌ Erro no diagnóstico:', err);
  } finally {
    await pool.end();
  }
}

validateTag();
