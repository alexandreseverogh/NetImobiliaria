const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function analisarPermissions() {
  try {
    console.log('🔍 Analisando problemas específicos na tabela permissions...\n');

    // 1. Verificar registros para feature_id = 1
    console.log('📋 Registros para feature_id = 1:');
    const result1 = await pool.query(`
      SELECT id, feature_id, action, description 
      FROM permissions 
      WHERE feature_id = 1 
      ORDER BY id
    `);
    
    result1.rows.forEach(row => {
      console.log(`ID: ${row.id}, action: "${row.action}", description: "${row.description || 'NULL'}"`);
    });

    // 2. Verificar inconsistências de case
    console.log('\n🚨 Verificando inconsistências de case...');
    const result2 = await pool.query(`
      SELECT 
        feature_id, 
        LOWER(action) as action_lower, 
        COUNT(*) as total_variacoes, 
        STRING_AGG(DISTINCT action, ', ') as variacoes_case,
        STRING_AGG(id::text, ', ') as ids_envolvidos
      FROM permissions 
      GROUP BY feature_id, LOWER(action) 
      HAVING COUNT(DISTINCT action) > 1 
      ORDER BY feature_id, action_lower
    `);

    if (result2.rows.length === 0) {
      console.log('✅ Nenhuma inconsistência de case encontrada!');
    } else {
      result2.rows.forEach(row => {
        console.log(`- feature_id: ${row.feature_id}, variacoes: [${row.variacoes_case}], ids: [${row.ids_envolvidos}]`);
      });
    }

    // 3. Verificar descrições nulas/vazias
    console.log('\n📊 Verificando descrições problemáticas...');
    const result3 = await pool.query(`
      SELECT COUNT(*) as total_nulas 
      FROM permissions 
      WHERE description IS NULL OR description = 'null' OR description = ''
    `);
    
    console.log(`Total de descrições nulas/vazias: ${result3.rows[0].total_nulas}`);

    // 4. Mostrar exemplos de descrições problemáticas
    const result4 = await pool.query(`
      SELECT id, feature_id, action, description 
      FROM permissions 
      WHERE description IS NULL OR description = 'null' OR description = '' 
      LIMIT 10
    `);

    if (result4.rows.length > 0) {
      console.log('\n🔍 Primeiros registros com descrição problemática:');
      result4.rows.forEach(row => {
        console.log(`ID: ${row.id}, feature_id: ${row.feature_id}, action: "${row.action}", description: "${row.description || 'NULL'}"`);
      });
    }

    // 5. Verificar se há registros com mesmo feature_id e action (ignorando case)
    console.log('\n🔍 Verificando possíveis duplicatas (ignorando case)...');
    const result5 = await pool.query(`
      SELECT 
        feature_id,
        LOWER(action) as action_lower,
        COUNT(*) as total,
        STRING_AGG(id::text, ', ') as ids,
        STRING_AGG(action, ', ') as actions
      FROM permissions
      GROUP BY feature_id, LOWER(action)
      HAVING COUNT(*) > 1
      ORDER BY feature_id, action_lower
    `);

    if (result5.rows.length === 0) {
      console.log('✅ Nenhuma duplicata encontrada (mesmo ignorando case)!');
    } else {
      console.log('🚨 Possíveis duplicatas encontradas:');
      result5.rows.forEach(row => {
        console.log(`- feature_id: ${row.feature_id}, action: [${row.actions}], ids: [${row.ids}]`);
      });
    }

    console.log('\n✅ Análise concluída!');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

analisarPermissions();
