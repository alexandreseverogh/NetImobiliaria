const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function aplicarTriggersCorrigido() {
  try {
    console.log('🔧 Aplicando triggers de sincronização (versão corrigida)...\n');

    // 1. Criar função principal do trigger
    console.log('1️⃣ Criando função sync_feature_category_id...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION sync_feature_category_id()
      RETURNS TRIGGER AS $$
      BEGIN
          -- Se é INSERT ou UPDATE, atualizar category_id
          IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
              -- Se é UPDATE e a categoria mudou, limpar a categoria antiga primeiro
              IF TG_OP = 'UPDATE' AND OLD.category_id != NEW.category_id THEN
                  UPDATE system_features 
                  SET category_id = NULL 
                  WHERE id = OLD.feature_id AND category_id = OLD.category_id;
              END IF;
              
              -- Atualizar com a nova categoria
              UPDATE system_features 
              SET category_id = NEW.category_id 
              WHERE id = NEW.feature_id;
              
              RETURN NEW;
          END IF;
          
          -- Se é DELETE, limpar category_id
          IF TG_OP = 'DELETE' THEN
              UPDATE system_features 
              SET category_id = NULL 
              WHERE id = OLD.feature_id AND category_id = OLD.category_id;
              
              RETURN OLD;
          END IF;
          
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função sync_feature_category_id criada');

    // 2. Criar triggers
    console.log('\n2️⃣ Criando triggers...');
    
    // Trigger INSERT
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_sync_feature_category_insert ON system_feature_categorias;
      CREATE TRIGGER trigger_sync_feature_category_insert
          AFTER INSERT ON system_feature_categorias
          FOR EACH ROW
          EXECUTE FUNCTION sync_feature_category_id();
    `);
    console.log('✅ Trigger INSERT criado');

    // Trigger UPDATE
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_sync_feature_category_update ON system_feature_categorias;
      CREATE TRIGGER trigger_sync_feature_category_update
          AFTER UPDATE ON system_feature_categorias
          FOR EACH ROW
          EXECUTE FUNCTION sync_feature_category_id();
    `);
    console.log('✅ Trigger UPDATE criado');

    // Trigger DELETE
    await pool.query(`
      DROP TRIGGER IF EXISTS trigger_sync_feature_category_delete ON system_feature_categorias;
      CREATE TRIGGER trigger_sync_feature_category_delete
          AFTER DELETE ON system_feature_categorias
          FOR EACH ROW
          EXECUTE FUNCTION sync_feature_category_id();
    `);
    console.log('✅ Trigger DELETE criado');

    // 3. Criar função de validação
    console.log('\n3️⃣ Criando função de validação...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION validate_feature_category_consistency()
      RETURNS TABLE(
          feature_id INTEGER,
          feature_name VARCHAR,
          sf_category_id INTEGER,
          sfc_category_id INTEGER,
          status TEXT
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              sf.id as feature_id,
              sf.name as feature_name,
              sf.category_id as sf_category_id,
              sfc.category_id as sfc_category_id,
              CASE 
                  WHEN sf.category_id IS NULL AND sfc.category_id IS NULL THEN 'SEM_CATEGORIA'
                  WHEN sf.category_id IS NULL AND sfc.category_id IS NOT NULL THEN 'SF_NULL'
                  WHEN sf.category_id IS NOT NULL AND sfc.category_id IS NULL THEN 'SFC_NULL'
                  WHEN sf.category_id = sfc.category_id THEN 'CONSISTENTE'
                  ELSE 'INCONSISTENTE'
              END as status
          FROM system_features sf
          LEFT JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
          ORDER BY sf.name;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função de validação criada');

    // 4. Criar função de sincronização manual
    console.log('\n4️⃣ Criando função de sincronização manual...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION sync_all_feature_categories()
      RETURNS TABLE(
          feature_id INTEGER,
          feature_name VARCHAR,
          action TEXT
      ) AS $$
      DECLARE
          rec RECORD;
      BEGIN
          -- Limpar todas as categorias em system_features
          UPDATE system_features SET category_id = NULL;
          
          -- Repopular baseado em system_feature_categorias
          FOR rec IN 
              SELECT DISTINCT sfc.feature_id, sf.name as feature_name
              FROM system_feature_categorias sfc
              JOIN system_features sf ON sfc.feature_id = sf.id
          LOOP
              -- Pegar a categoria mais recente para cada funcionalidade
              UPDATE system_features 
              SET category_id = (
                  SELECT sfc.category_id 
                  FROM system_feature_categorias sfc 
                  WHERE sfc.feature_id = rec.feature_id 
                  ORDER BY sfc.created_at DESC 
                  LIMIT 1
              )
              WHERE id = rec.feature_id;
              
              RETURN QUERY SELECT rec.feature_id, rec.feature_name, 'SYNCED';
          END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função de sincronização manual criada');

    // 5. Verificar se tudo foi criado
    console.log('\n5️⃣ Verificando triggers criados...');
    const triggers = await pool.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers 
      WHERE trigger_name LIKE '%sync_feature_category%'
      ORDER BY trigger_name
    `);

    if (triggers.rows.length > 0) {
      console.log('✅ Triggers encontrados:');
      triggers.rows.forEach(trigger => {
        console.log(`- ${trigger.trigger_name} (${trigger.event_manipulation})`);
      });
    } else {
      console.log('❌ Nenhum trigger encontrado');
    }

    // 6. Verificar funções
    console.log('\n6️⃣ Verificando funções criadas...');
    const functions = await pool.query(`
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines 
      WHERE routine_name IN (
        'sync_feature_category_id',
        'validate_feature_category_consistency',
        'sync_all_feature_categories'
      )
      ORDER BY routine_name
    `);

    if (functions.rows.length > 0) {
      console.log('✅ Funções encontradas:');
      functions.rows.forEach(func => {
        console.log(`- ${func.routine_name} (${func.routine_type})`);
      });
    } else {
      console.log('❌ Nenhuma função encontrada');
    }

    // 7. Testar função de validação
    console.log('\n7️⃣ Testando função de validação...');
    try {
      const validation = await pool.query('SELECT * FROM validate_feature_category_consistency() LIMIT 5');
      console.log('✅ Função de validação funcionando:');
      validation.rows.forEach(row => {
        console.log(`- ${row.feature_name}: ${row.status}`);
      });
    } catch (error) {
      console.log(`❌ Erro ao testar validação: ${error.message}`);
    }

    // 8. Executar sincronização inicial
    console.log('\n8️⃣ Executando sincronização inicial...');
    try {
      const syncResult = await pool.query('SELECT * FROM sync_all_feature_categories()');
      console.log(`✅ Sincronização executada: ${syncResult.rows.length} funcionalidades sincronizadas`);
    } catch (error) {
      console.log(`❌ Erro na sincronização: ${error.message}`);
    }

    console.log('\n🎉 TRIGGERS DE SINCRONIZAÇÃO APLICADOS COM SUCESSO!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Modificar APIs para usar system_feature_categorias como fonte da verdade');
    console.log('2. Testar triggers com operações CRUD');
    console.log('3. Validar consistência das tabelas');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await pool.end();
  }
}

aplicarTriggersCorrigido();
