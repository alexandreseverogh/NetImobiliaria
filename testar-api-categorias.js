const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function testarApiCategorias() {
  try {
    console.log('🔍 Testando API de categorias após correção...\n');

    // 1. Testar query principal (sem include_features)
    console.log('1️⃣ Testando query principal:');
    const mainQuery = `
      SELECT 
        c.id,
        c.name,
        c.slug,
        c.description,
        c.icon,
        c.color,
        c.sort_order,
        c.is_active,
        c.created_at,
        c.updated_at,
        c.created_by,
        c.updated_by
      FROM system_categorias c
      WHERE 1=1 AND c.is_active = true
      ORDER BY c.sort_order ASC, c.name ASC
    `;

    const mainResult = await pool.query(mainQuery);
    console.log(`✅ Query principal executada com sucesso: ${mainResult.rows.length} categorias`);
    
    if (mainResult.rows.length > 0) {
      console.log('Categorias encontradas:');
      mainResult.rows.forEach(cat => {
        console.log(`- ${cat.name} (ID: ${cat.id})`);
      });
    }

    // 2. Testar query com include_features
    console.log('\n2️⃣ Testando query com include_features:');
    const categories = mainResult.rows;
    
    if (categories.length > 0) {
      const categoryIds = categories.map(c => c.id);
      const featuresQuery = `
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
      
      const featuresResult = await pool.query(featuresQuery, [categoryIds]);
      console.log(`✅ Query de features executada com sucesso: ${featuresResult.rows.length} associações`);

      // Agrupar funcionalidades por categoria
      const featuresByCategory = featuresResult.rows.reduce((acc, feature) => {
        if (!acc[feature.category_id]) {
          acc[feature.category_id] = []
        }
        acc[feature.category_id].push({
          id: feature.feature_id,
          name: feature.feature_name,
          category_id: feature.feature_category_id,
          url: feature.feature_url,
          description: feature.feature_description,
          is_active: feature.feature_is_active,
          sort_order: feature.feature_sort_order
        })
        return acc
      }, {});

      // Adicionar funcionalidades às categorias
      categories.forEach(category => {
        category.features = featuresByCategory[category.id] || []
      });

      console.log('\n3️⃣ Resultado final:');
      categories.forEach(cat => {
        console.log(`- ${cat.name}: ${cat.features.length} funcionalidades`);
        if (cat.features.length > 0) {
          cat.features.forEach(feature => {
            console.log(`  * ${feature.name} (${feature.url})`);
          });
        }
      });
    } else {
      console.log('⚠️ Nenhuma categoria encontrada para testar features');
    }

    console.log('\n🎯 CONCLUSÃO:');
    console.log('✅ Todas as queries foram executadas com sucesso!');
    console.log('✅ A API de categorias deve estar funcionando agora!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

testarApiCategorias();
