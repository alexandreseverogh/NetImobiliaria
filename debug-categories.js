const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'Roberto@2007',
  port: 5432,
});

async function debugCategories() {
  console.log('🔍 INVESTIGANDO PROBLEMA DAS CATEGORIAS VAZIAS\n');
  
  try {
    // 1. Verificar funcionalidades problemáticas
    console.log('📋 1. VERIFICANDO FUNCIONALIDADES PROBLEMÁTICAS:');
    const problematicFeatures = await pool.query(`
      SELECT 
        sf.id,
        sf.name,
        sf.description,
        sf.category_id,
        sc.name as category_name
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE sf.name IN (
        'Análise de Logs',
        'Configurações de Logs', 
        'Relatórios de Logs',
        'Sessões'
      )
      ORDER BY sf.name
    `);
    
    console.log(`Encontradas ${problematicFeatures.rows.length} funcionalidades problemáticas:`);
    problematicFeatures.rows.forEach(feature => {
      console.log(`  - ${feature.name}: category_id=${feature.category_id}, category_name=${feature.category_name || 'NULL'}`);
    });
    
    console.log('\n📋 2. VERIFICANDO FUNCIONALIDADE QUE FUNCIONA:');
    const workingFeature = await pool.query(`
      SELECT 
        sf.id,
        sf.name,
        sf.description,
        sf.category_id,
        sc.name as category_name
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE sf.name = 'Categorias de Funcionalidades'
    `);
    
    if (workingFeature.rows.length > 0) {
      const feature = workingFeature.rows[0];
      console.log(`  - ${feature.name}: category_id=${feature.category_id}, category_name=${feature.category_name || 'NULL'}`);
    }
    
    console.log('\n📋 3. VERIFICANDO TODAS AS CATEGORIAS DISPONÍVEIS:');
    const allCategories = await pool.query(`
      SELECT id, name, description 
      FROM system_categorias 
      ORDER BY name
    `);
    
    console.log(`Encontradas ${allCategories.rows.length} categorias:`);
    allCategories.rows.forEach(cat => {
      console.log(`  - ID ${cat.id}: ${cat.name} (${cat.description})`);
    });
    
    console.log('\n📋 4. VERIFICANDO FUNCIONALIDADES SEM CATEGORIA:');
    const featuresWithoutCategory = await pool.query(`
      SELECT 
        sf.id,
        sf.name,
        sf.category_id
      FROM system_features sf
      WHERE sf.category_id IS NULL
      ORDER BY sf.name
    `);
    
    console.log(`Encontradas ${featuresWithoutCategory.rows.length} funcionalidades sem categoria:`);
    featuresWithoutCategory.rows.forEach(feature => {
      console.log(`  - ${feature.name}: category_id=${feature.category_id}`);
    });
    
    console.log('\n📋 5. VERIFICANDO SE EXISTE CATEGORIA "Sistema":');
    const sistemaCategory = await pool.query(`
      SELECT id, name, description 
      FROM system_categorias 
      WHERE name ILIKE '%sistema%'
    `);
    
    if (sistemaCategory.rows.length > 0) {
      console.log('✅ Categoria "Sistema" encontrada:');
      sistemaCategory.rows.forEach(cat => {
        console.log(`  - ID ${cat.id}: ${cat.name} (${cat.description})`);
      });
    } else {
      console.log('❌ Categoria "Sistema" NÃO encontrada!');
    }
    
  } catch (error) {
    console.error('❌ Erro na investigação:', error.message);
  } finally {
    await pool.end();
  }
}

debugCategories();
