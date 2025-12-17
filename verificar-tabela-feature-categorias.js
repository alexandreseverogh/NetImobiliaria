const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function verificarTabela() {
  try {
    console.log('🔍 Verificando tabela system_feature_categorias...\n');

    // 1. Verificar se a tabela existe
    console.log('1️⃣ Verificando se a tabela existe:');
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'system_feature_categorias'
      );
    `);

    console.log(`Tabela system_feature_categorias existe: ${tableExists.rows[0].exists}`);

    if (!tableExists.rows[0].exists) {
      console.log('❌ PROBLEMA: A tabela system_feature_categorias não existe!');
      console.log('Esta é a causa do erro 500 na API.');
      return;
    }

    // 2. Verificar estrutura da tabela
    console.log('\n2️⃣ Estrutura da tabela:');
    const tableStructure = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'system_feature_categorias'
      ORDER BY ordinal_position;
    `);

    console.log('Colunas encontradas:');
    tableStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 3. Verificar dados na tabela
    console.log('\n3️⃣ Dados na tabela:');
    const dataCount = await pool.query('SELECT COUNT(*) FROM system_feature_categorias');
    console.log(`Total de registros: ${dataCount.rows[0].count}`);

    if (parseInt(dataCount.rows[0].count) > 0) {
      const sampleData = await pool.query('SELECT * FROM system_feature_categorias LIMIT 5');
      console.log('Amostra de dados:');
      sampleData.rows.forEach(row => {
        console.log(`- ID: ${row.id}, category_id: ${row.category_id}, feature_id: ${row.feature_id}`);
      });
    }

    // 4. Verificar relacionamentos
    console.log('\n4️⃣ Verificando relacionamentos:');
    
    // Verificar se existem categorias
    const categoriesCount = await pool.query('SELECT COUNT(*) FROM system_categorias');
    console.log(`Total de categorias: ${categoriesCount.rows[0].count}`);

    // Verificar se existem funcionalidades
    const featuresCount = await pool.query('SELECT COUNT(*) FROM system_features');
    console.log(`Total de funcionalidades: ${featuresCount.rows[0].count}`);

    // 5. Testar a query que está falhando
    console.log('\n5️⃣ Testando query da API:');
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

      // Buscar IDs de categorias para testar
      const categoryIds = await pool.query('SELECT id FROM system_categorias LIMIT 3');
      const ids = categoryIds.rows.map(row => row.id);

      if (ids.length > 0) {
        const testResult = await pool.query(testQuery, [ids]);
        console.log(`✅ Query executada com sucesso: ${testResult.rows.length} registros`);
      } else {
        console.log('⚠️ Nenhuma categoria encontrada para testar');
      }

    } catch (queryError) {
      console.log(`❌ Erro na query: ${queryError.message}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await pool.end();
  }
}

verificarTabela();
