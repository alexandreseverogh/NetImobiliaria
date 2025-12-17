const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'Roberto@2007',
  port: 5432,
});

async function fixCategoriesLogs() {
  console.log('🔧 CORRIGINDO CATEGORIAS DAS FUNCIONALIDADES DE LOGS\n');
  
  try {
    // 1. Verificar estado atual
    console.log('📋 1. ESTADO ATUAL (ANTES DA CORREÇÃO):');
    const beforeUpdate = await pool.query(`
      SELECT 
        sf.id,
        sf.name,
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
    
    console.log('Funcionalidades problemáticas:');
    beforeUpdate.rows.forEach(feature => {
      console.log(`  - ${feature.name}: category_id=${feature.category_id}, category_name=${feature.category_name || 'NULL'}`);
    });
    
    // 2. Executar correção
    console.log('\n🔧 2. EXECUTANDO CORREÇÃO...');
    const updateResult = await pool.query(`
      UPDATE system_features 
      SET category_id = 1 
      WHERE name IN (
        'Análise de Logs',
        'Configurações de Logs', 
        'Relatórios de Logs',
        'Sessões'
      )
    `);
    
    console.log(`✅ UPDATE executado: ${updateResult.rowCount} registros atualizados`);
    
    // 3. Verificar estado após correção
    console.log('\n📋 3. ESTADO APÓS CORREÇÃO:');
    const afterUpdate = await pool.query(`
      SELECT 
        sf.id,
        sf.name,
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
    
    console.log('Funcionalidades corrigidas:');
    afterUpdate.rows.forEach(feature => {
      console.log(`  - ${feature.name}: category_id=${feature.category_id}, category_name=${feature.category_name || 'NULL'}`);
    });
    
    // 4. Verificar se todas estão com categoria "Sistema"
    const allFixed = afterUpdate.rows.every(feature => feature.category_id === 1);
    if (allFixed) {
      console.log('\n✅ SUCESSO: Todas as funcionalidades de logs agora têm category_id=1 (Sistema)');
    } else {
      console.log('\n❌ ERRO: Algumas funcionalidades ainda não foram corrigidas');
    }
    
  } catch (error) {
    console.error('❌ Erro na correção:', error.message);
  } finally {
    await pool.end();
  }
}

fixCategoriesLogs();




