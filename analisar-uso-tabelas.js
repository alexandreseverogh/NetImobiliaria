const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function analisarUsoTabelas() {
  try {
    console.log('🔍 Analisando uso das tabelas system_feature_categorias vs system_features.category_id...\n');

    // 1. Verificar estrutura das tabelas
    console.log('1️⃣ Estrutura das tabelas:');
    
    // system_features
    const sfStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'system_features' AND column_name = 'category_id'
    `);
    
    if (sfStructure.rows.length > 0) {
      console.log('✅ system_features.category_id existe:');
      sfStructure.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('❌ system_features.category_id NÃO existe');
    }

    // system_feature_categorias
    const sfcStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'system_feature_categorias'
      ORDER BY ordinal_position
    `);
    
    console.log('\n✅ system_feature_categorias:');
    sfcStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 2. Verificar dados nas tabelas
    console.log('\n2️⃣ Dados nas tabelas:');
    
    // system_features com category_id
    const sfData = await pool.query(`
      SELECT 
        COUNT(*) as total_features,
        COUNT(category_id) as features_com_category_id,
        COUNT(*) - COUNT(category_id) as features_sem_category_id
      FROM system_features
    `);
    
    console.log('system_features:');
    console.log(`- Total de funcionalidades: ${sfData.rows[0].total_features}`);
    console.log(`- Com category_id: ${sfData.rows[0].features_com_category_id}`);
    console.log(`- Sem category_id: ${sfData.rows[0].features_sem_category_id}`);

    // system_feature_categorias
    const sfcData = await pool.query(`
      SELECT COUNT(*) as total_associacoes
      FROM system_feature_categorias
    `);
    
    console.log(`\nsystem_feature_categorias:`);
    console.log(`- Total de associações: ${sfcData.rows[0].total_associacoes}`);

    // 3. Comparar os dois relacionamentos
    console.log('\n3️⃣ Comparando relacionamentos:');
    
    // Relacionamento direto (system_features.category_id)
    const relDireto = await pool.query(`
      SELECT 
        sc.name as categoria_nome,
        COUNT(sf.id) as total_features
      FROM system_categorias sc
      LEFT JOIN system_features sf ON sc.id = sf.category_id
      GROUP BY sc.id, sc.name
      ORDER BY sc.name
    `);
    
    console.log('Relacionamento DIRETO (system_features.category_id):');
    relDireto.rows.forEach(row => {
      console.log(`- ${row.categoria_nome}: ${row.total_features} funcionalidades`);
    });

    // Relacionamento via tabela intermediária (system_feature_categorias)
    const relIntermediario = await pool.query(`
      SELECT 
        sc.name as categoria_nome,
        COUNT(sfc.feature_id) as total_features
      FROM system_categorias sc
      LEFT JOIN system_feature_categorias sfc ON sc.id = sfc.category_id
      GROUP BY sc.id, sc.name
      ORDER BY sc.name
    `);
    
    console.log('\nRelacionamento INTERMEDIÁRIO (system_feature_categorias):');
    relIntermediario.rows.forEach(row => {
      console.log(`- ${row.categoria_nome}: ${row.total_features} funcionalidades`);
    });

    // 4. Verificar inconsistências
    console.log('\n4️⃣ Verificando inconsistências:');
    
    const inconsistencias = await pool.query(`
      SELECT 
        sf.id as feature_id,
        sf.name as feature_name,
        sf.category_id as sf_category_id,
        sfc.category_id as sfc_category_id,
        CASE 
          WHEN sf.category_id IS NULL AND sfc.category_id IS NULL THEN 'SEM RELACIONAMENTO'
          WHEN sf.category_id IS NULL AND sfc.category_id IS NOT NULL THEN 'SÓ INTERMEDIÁRIO'
          WHEN sf.category_id IS NOT NULL AND sfc.category_id IS NULL THEN 'SÓ DIRETO'
          WHEN sf.category_id != sfc.category_id THEN 'CONFLITO'
          ELSE 'CONSISTENTE'
        END as status
      FROM system_features sf
      LEFT JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
      ORDER BY status, sf.name
    `);
    
    console.log('Status dos relacionamentos:');
    const statusCount = {};
    inconsistencias.rows.forEach(row => {
      if (!statusCount[row.status]) statusCount[row.status] = 0;
      statusCount[row.status]++;
      
      if (row.status !== 'CONSISTENTE' && row.status !== 'SÓ DIRETO') {
        console.log(`- ${row.feature_name}: ${row.status} (SF: ${row.sf_category_id}, SFC: ${row.sfc_category_id})`);
      }
    });
    
    console.log('\nResumo dos status:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`- ${status}: ${count} funcionalidades`);
    });

    // 5. Verificar qual relacionamento é usado nas APIs
    console.log('\n5️⃣ Análise do uso nas APIs:');
    console.log('✅ APIs que usam system_feature_categorias:');
    console.log('- /api/admin/categorias (GET com include_features=true)');
    console.log('- /api/admin/categorias/[id] (GET com include_features=true)');
    console.log('- /api/admin/categorias/[id]/features (todas as operações)');
    console.log('- /api/admin/categorias (DELETE - validação)');
    console.log('- /api/admin/system-features/populate-feature-categories');
    
    console.log('\n✅ APIs que usam system_features.category_id:');
    console.log('- /api/admin/auth/login (busca permissões)');
    console.log('- /lib/database/users.ts (verificação de permissões)');
    console.log('- /api/admin/system-features (listagem)');
    console.log('- /api/admin/system-features/migrate-categories');

    console.log('\n🎯 CONCLUSÃO:');
    console.log('✅ AMBAS as tabelas estão sendo utilizadas!');
    console.log('✅ system_feature_categorias: Usado para gestão de categorias');
    console.log('✅ system_features.category_id: Usado para permissões e listagem');
    console.log('⚠️ POSSÍVEL PROBLEMA: Relacionamentos duplos podem causar inconsistências');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

analisarUsoTabelas();
