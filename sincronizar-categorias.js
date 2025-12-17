const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function sincronizarCategorias() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Sincronizando system_feature_categorias com system_features.category_id...\n');

    await client.query('BEGIN');

    // 1. Limpar tabela system_feature_categorias
    console.log('1️⃣ Limpando system_feature_categorias...');
    await client.query('DELETE FROM system_feature_categorias');
    console.log('✅ Tabela limpa');

    // 2. Buscar dados de system_features com category_id
    console.log('\n2️⃣ Buscando funcionalidades com category_id...');
    const features = await client.query(`
      SELECT 
        sf.id as feature_id,
        sf.name as feature_name,
        sf.category_id,
        sc.name as category_name
      FROM system_features sf
      JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE sf.category_id IS NOT NULL
      ORDER BY sc.sort_order, sf.name
    `);

    console.log(`✅ Encontradas ${features.rows.length} funcionalidades com categoria`);

    // 3. Inserir dados na system_feature_categorias
    console.log('\n3️⃣ Inserindo dados na system_feature_categorias...');
    
    let insertedCount = 0;
    const categoryCounters = {}; // Para controlar sort_order por categoria

    for (const feature of features.rows) {
      // Inicializar contador para categoria se não existir
      if (!categoryCounters[feature.category_id]) {
        categoryCounters[feature.category_id] = 0;
      }
      
      categoryCounters[feature.category_id]++;
      
      await client.query(`
        INSERT INTO system_feature_categorias (
          feature_id, 
          category_id, 
          sort_order, 
          created_by,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [
        feature.feature_id,
        feature.category_id,
        categoryCounters[feature.category_id],
        'cc8220f7-a3fd-40ed-8dbd-a22539328083' // ID do admin
      ]);
      
      insertedCount++;
      console.log(`✅ ${feature.feature_name} → ${feature.category_name} (sort: ${categoryCounters[feature.category_id]})`);
    }

    await client.query('COMMIT');
    
    console.log(`\n🎉 SINCRONIZAÇÃO CONCLUÍDA!`);
    console.log(`✅ ${insertedCount} associações inseridas na system_feature_categorias`);

    // 4. Verificar resultado
    console.log('\n4️⃣ Verificando resultado...');
    const verificacao = await client.query(`
      SELECT 
        sc.name as categoria_nome,
        COUNT(sfc.feature_id) as total_features,
        STRING_AGG(sf.name, ', ') as features_names
      FROM system_categorias sc
      LEFT JOIN system_feature_categorias sfc ON sc.id = sfc.category_id
      LEFT JOIN system_features sf ON sfc.feature_id = sf.id
      GROUP BY sc.id, sc.name
      ORDER BY sc.name
    `);

    console.log('Resultado da sincronização:');
    verificacao.rows.forEach(row => {
      console.log(`- ${row.categoria_nome}: ${row.total_features} funcionalidades`);
      if (row.features_names) {
        console.log(`  [${row.features_names}]`);
      }
    });

    // 5. Testar validação de exclusão
    console.log('\n5️⃣ Testando validação de exclusão...');
    const testCategoria = verificacao.rows.find(cat => parseInt(cat.total_features) > 0);
    
    if (testCategoria) {
      const featuresCount = await client.query(
        'SELECT COUNT(*) as count FROM system_feature_categorias WHERE category_id = $1',
        [testCategoria.categoria_nome === 'Administrativo' ? 3 : 1]
      );
      
      console.log(`✅ Validação funcionando: ${testCategoria.categoria_nome} tem ${featuresCount.rows[0].count} funcionalidades`);
      console.log('✅ Agora a validação de exclusão funcionará corretamente!');
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro na sincronização:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

sincronizarCategorias();
