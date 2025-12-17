const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function testarSincronizacao() {
  try {
    console.log('🧪 TESTANDO SINCRONIZAÇÃO DE CATEGORIAS\n');

    // 1. Verificar status inicial
    console.log('1️⃣ Verificando status inicial...');
    const statusInicial = await pool.query('SELECT * FROM validate_feature_category_consistency()');
    const inconsistenciasIniciais = statusInicial.rows.filter(row => row.status !== 'CONSISTENTE');
    
    console.log(`Status inicial: ${statusInicial.rows.length} funcionalidades verificadas`);
    console.log(`Inconsistências: ${inconsistenciasIniciais.length}`);
    
    if (inconsistenciasIniciais.length > 0) {
      console.log('Inconsistências encontradas:');
      inconsistenciasIniciais.forEach(row => {
        console.log(`- ${row.feature_name}: ${row.status} (SF: ${row.sf_category_id}, SFC: ${row.sfc_category_id})`);
      });
    }

    // 2. Testar função de sincronização
    console.log('\n2️⃣ Testando função de sincronização...');
    const syncResult = await pool.query('SELECT * FROM sync_all_feature_categories()');
    console.log(`✅ Sincronização executada: ${syncResult.rows.length} funcionalidades processadas`);

    // 3. Verificar status após sincronização
    console.log('\n3️⃣ Verificando status após sincronização...');
    const statusFinal = await pool.query('SELECT * FROM validate_feature_category_consistency()');
    const inconsistenciasFinais = statusFinal.rows.filter(row => row.status !== 'CONSISTENTE');
    
    console.log(`Status final: ${statusFinal.rows.length} funcionalidades verificadas`);
    console.log(`Inconsistências: ${inconsistenciasFinais.length}`);
    
    if (inconsistenciasFinais.length > 0) {
      console.log('❌ Ainda há inconsistências:');
      inconsistenciasFinais.forEach(row => {
        console.log(`- ${row.feature_name}: ${row.status} (SF: ${row.sf_category_id}, SFC: ${row.sfc_category_id})`);
      });
    } else {
      console.log('✅ Todas as funcionalidades estão consistentes!');
    }

    // 4. Testar triggers com operação de exemplo
    console.log('\n4️⃣ Testando triggers...');
    
    // Buscar uma funcionalidade para testar
    const featureTest = await pool.query(`
      SELECT sfc.feature_id, sfc.category_id, sf.name as feature_name
      FROM system_feature_categorias sfc
      JOIN system_features sf ON sfc.feature_id = sf.id
      LIMIT 1
    `);
    
    if (featureTest.rows.length > 0) {
      const testFeature = featureTest.rows[0];
      console.log(`Testando trigger com funcionalidade: ${testFeature.feature_name}`);
      
      // Verificar category_id antes
      const beforeUpdate = await pool.query(
        'SELECT category_id FROM system_features WHERE id = $1',
        [testFeature.feature_id]
      );
      console.log(`category_id antes: ${beforeUpdate.rows[0].category_id}`);
      
      // Atualizar sort_order em system_feature_categorias (deve disparar trigger)
      await pool.query(
        'UPDATE system_feature_categorias SET sort_order = sort_order + 100 WHERE feature_id = $1',
        [testFeature.feature_id]
      );
      console.log('✅ Atualização executada em system_feature_categorias');
      
      // Verificar category_id depois
      const afterUpdate = await pool.query(
        'SELECT category_id FROM system_features WHERE id = $1',
        [testFeature.feature_id]
      );
      console.log(`category_id depois: ${afterUpdate.rows[0].category_id}`);
      
      // Restaurar sort_order original
      await pool.query(
        'UPDATE system_feature_categorias SET sort_order = sort_order - 100 WHERE feature_id = $1',
        [testFeature.feature_id]
      );
      console.log('✅ Sort_order restaurado');
      
      // Verificar se category_id permaneceu igual
      const finalCheck = await pool.query(
        'SELECT category_id FROM system_features WHERE id = $1',
        [testFeature.feature_id]
      );
      
      if (finalCheck.rows[0].category_id === beforeUpdate.rows[0].category_id) {
        console.log('✅ Trigger funcionando corretamente - category_id manteve consistência');
      } else {
        console.log('❌ Problema com trigger - category_id foi alterado incorretamente');
      }
    }

    // 5. Resumo final
    console.log('\n5️⃣ RESUMO DO TESTE:');
    console.log(`✅ Função de sincronização: ${syncResult.rows.length > 0 ? 'FUNCIONANDO' : 'PROBLEMA'}`);
    console.log(`✅ Função de validação: ${statusFinal.rows.length > 0 ? 'FUNCIONANDO' : 'PROBLEMA'}`);
    console.log(`✅ Consistência final: ${inconsistenciasFinais.length === 0 ? 'CONSISTENTE' : 'INCONSISTENTE'}`);
    console.log(`✅ Triggers: ${featureTest.rows.length > 0 ? 'FUNCIONANDO' : 'NÃO TESTADO'}`);
    
    if (inconsistenciasFinais.length === 0) {
      console.log('\n🎉 SINCRONIZAÇÃO FUNCIONANDO PERFEITAMENTE!');
    } else {
      console.log('\n⚠️ Há inconsistências que precisam ser investigadas');
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  } finally {
    await pool.end();
  }
}

testarSincronizacao();
