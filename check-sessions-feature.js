const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'Roberto@2007',
  port: 5432,
});

async function checkSessionsFeature() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando funcionalidade de Sessões...');
    
    // 1. Buscar funcionalidade ID 31
    const featureResult = await client.query(`
      SELECT id, name, description, category_id
      FROM system_features
      WHERE id = 31
    `);
    
    if (featureResult.rows.length > 0) {
      const feature = featureResult.rows[0];
      console.log('✅ Funcionalidade encontrada:', feature);
      
      if (feature.category_id === null) {
        console.log('❌ PROBLEMA: category_id é NULL - não está associada a nenhuma categoria!');
      } else {
        console.log('✅ Funcionalidade associada à categoria ID:', feature.category_id);
      }
    } else {
      console.log('❌ Funcionalidade ID 31 não encontrada!');
    }
    
    // 2. Verificar todas as funcionalidades com category_id NULL
    const nullCategoryResult = await client.query(`
      SELECT id, name, description, category_id
      FROM system_features
      WHERE category_id IS NULL
      ORDER BY id
    `);
    
    console.log('🔍 Funcionalidades SEM categoria (category_id = NULL):');
    nullCategoryResult.rows.forEach(feature => {
      console.log(`  - ID ${feature.id}: ${feature.name} (${feature.description})`);
    });
    
    // 3. Verificar como está na sidebar hardcoded
    console.log('🔍 Verificando AdminSidebar.tsx...');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSessionsFeature();




