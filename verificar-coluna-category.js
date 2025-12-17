const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function verificarColunaCategory() {
  try {
    console.log('🔍 Verificando coluna "category" na tabela system_features...\n');

    // 1. Verificar estrutura da tabela system_features
    console.log('1️⃣ Estrutura da tabela system_features:');
    const tableStructure = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'system_features'
      ORDER BY ordinal_position;
    `);

    console.log('Colunas encontradas:');
    tableStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 2. Verificar se existe coluna "category"
    const hasCategoryColumn = tableStructure.rows.some(col => col.column_name === 'category');
    const hasCategoryIdColumn = tableStructure.rows.some(col => col.column_name === 'category_id');
    
    console.log(`\n2️⃣ Análise das colunas:`);
    console.log(`Coluna "category" existe: ${hasCategoryColumn}`);
    console.log(`Coluna "category_id" existe: ${hasCategoryIdColumn}`);

    // 3. Testar query com category_id (se existir)
    if (hasCategoryIdColumn) {
      console.log('\n3️⃣ Testando query com category_id:');
      try {
        const testQuery = `
          SELECT 
            fc.category_id,
            fc.sort_order as feature_sort_order,
            sf.id as feature_id,
            sf.name as feature_name,
            sf.category_id as feature_category_id,
            sf.url as feature_url,
            sf.description as feature_description,
            sf.is_active as feature_is_active
          FROM system_feature_categorias fc
          JOIN system_features sf ON fc.feature_id = sf.id
          WHERE fc.category_id = ANY($1)
          ORDER BY fc.sort_order ASC, sf.name ASC
        `;

        const categoryIds = await pool.query('SELECT id FROM system_categorias LIMIT 3');
        const ids = categoryIds.rows.map(row => row.id);

        if (ids.length > 0) {
          const testResult = await pool.query(testQuery, [ids]);
          console.log(`✅ Query com category_id executada com sucesso: ${testResult.rows.length} registros`);
        }
      } catch (queryError) {
        console.log(`❌ Erro na query com category_id: ${queryError.message}`);
      }
    }

    // 4. Testar query com category (se existir)
    if (hasCategoryColumn) {
      console.log('\n4️⃣ Testando query com category:');
      try {
        const testQuery = `
          SELECT 
            fc.category_id,
            fc.sort_order as feature_sort_order,
            sf.id as feature_id,
            sf.name as feature_name,
            sf.category as feature_category,
            sf.url as feature_url,
            sf.description as feature_description,
            sf.is_active as feature_is_active
          FROM system_feature_categorias fc
          JOIN system_features sf ON fc.feature_id = sf.id
          WHERE fc.category_id = ANY($1)
          ORDER BY fc.sort_order ASC, sf.name ASC
        `;

        const categoryIds = await pool.query('SELECT id FROM system_categorias LIMIT 3');
        const ids = categoryIds.rows.map(row => row.id);

        if (ids.length > 0) {
          const testResult = await pool.query(testQuery, [ids]);
          console.log(`✅ Query com category executada com sucesso: ${testResult.rows.length} registros`);
        }
      } catch (queryError) {
        console.log(`❌ Erro na query com category: ${queryError.message}`);
      }
    }

    // 5. Verificar dados de exemplo
    console.log('\n5️⃣ Dados de exemplo da tabela system_features:');
    const sampleData = await pool.query('SELECT * FROM system_features LIMIT 3');
    sampleData.rows.forEach(row => {
      console.log(`- ID: ${row.id}, Name: ${row.name}, Category: ${row.category || 'NULL'}, Category_ID: ${row.category_id || 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await pool.end();
  }
}

verificarColunaCategory();
