const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

async function analyze() {
  console.log('--- 🔍 DIAGNÓSTICO DE PERFORMANCE E SEGURANÇA ---');
  
  try {
    // 1. Verificar estrutura de imovel_imagens
    const resImagens = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'imovel_imagens';
    `);
    console.log('\n[MÍDIA] Colunas em imovel_imagens:');
    console.table(resImagens.rows);

    // 2. Verificar índices críticos
    const resIndices = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename IN ('imoveis', 'imovel_imagens', 'proprietarios');
    `);
    console.log('\n[PERFORMANCE] Índices Existentes:');
    resIndices.rows.forEach(idx => console.log(`- ${idx.indexname}: ${idx.indexdef}`));

    // 3. Verificar volumetria de imagens (BYTEA)
    const resVolumetria = await pool.query(`
      SELECT 
        COUNT(*) as total_imagens,
        pg_size_pretty(SUM(pg_column_size(imagem))) as tamanho_total_bytea
      FROM imovel_imagens 
      WHERE pg_column_size(imagem) > 0;
    `);
    console.log('\n[VOLUMETRIA] Impacto BYTEA:');
    console.table(resVolumetria.rows);

    // 4. Verificar se a coluna semantic_data está indexada
    const resJsonb = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE indexdef LIKE '%semantic_data%';
    `);
    console.log('\n[GOVERNANÇA] Índices em semantic_data:', resJsonb.rows.length > 0 ? resJsonb.rows : 'Nenhum (Gargalo potencial)');

  } catch (err) {
    console.error('Erro na análise:', err.message);
  } finally {
    await pool.end();
  }
}

analyze();
