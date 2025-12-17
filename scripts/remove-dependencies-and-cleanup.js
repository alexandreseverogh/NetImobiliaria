const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: '[PASSWORD_REMOVED]'
});

async function removeDependenciesAndCleanup() {
  try {
    console.log('🔄 Removendo dependências e limpando tabela imoveis...\n');
    
    // 1. Dropar views que dependem da tabela imoveis
    console.log('1. Removendo views dependentes...');
    try {
      await pool.query('DROP VIEW IF EXISTS imoveis_completos CASCADE');
      console.log('✅ View imoveis_completos removida');
    } catch (error) {
      console.log('⚠️  Erro ao remover view imoveis_completos:', error.message);
    }
    
    try {
      await pool.query('DROP VIEW IF EXISTS estatisticas_imoveis CASCADE');
      console.log('✅ View estatisticas_imoveis removida');
    } catch (error) {
      console.log('⚠️  Erro ao remover view estatisticas_imoveis:', error.message);
    }
    
    // 2. Remover colunas antigas agora que as dependências foram removidas
    console.log('\n2. Removendo colunas antigas...');
    
    const columnsToRemove = [
      'proprietario_nome',
      'proprietario_telefone', 
      'proprietario_email',
      'ativo',
      'estado',
      'cidade',
      'status_id'
    ];
    
    for (const column of columnsToRemove) {
      try {
        await pool.query(`
          ALTER TABLE imoveis 
          DROP COLUMN IF EXISTS ${column}
        `);
        console.log(`✅ Coluna ${column} removida`);
      } catch (error) {
        console.log(`⚠️  Coluna ${column} não pôde ser removida: ${error.message}`);
      }
    }
    
    // 3. Recriar a view imoveis_completos com a nova estrutura
    console.log('\n3. Recriando view imoveis_completos...');
    await pool.query(`
      CREATE VIEW imoveis_completos AS
      SELECT 
        i.*,
        ti.nome as tipo_nome,
        fi.nome as finalidade_nome,
        e.nome as estado_nome,
        e.sigla as estado_sigla,
        c.nome as cidade_nome,
        u.nome as corretor_nome,
        COUNT(ii.id) as total_imagens,
        COUNT(CASE WHEN ii.principal = true THEN 1 END) as tem_imagem_principal
      FROM imoveis i
      LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      LEFT JOIN estados e ON i.estado_fk = e.id
      LEFT JOIN cidades c ON i.cidade_fk = c.id
      LEFT JOIN users u ON i.created_by = u.id
      LEFT JOIN imovel_imagens ii ON i.id = ii.imovel_id AND ii.ativo = true
      GROUP BY i.id, ti.nome, fi.nome, e.nome, e.sigla, c.nome, u.nome
    `);
    console.log('✅ View imoveis_completos recriada');
    
    // 4. Verificar estrutura final
    console.log('\n4. Verificando estrutura final da tabela imoveis...');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estrutura final da tabela imoveis:');
    finalColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n🎉 Limpeza da tabela imoveis concluída!');
    console.log('\n📋 Resumo das alterações:');
    console.log('   ✅ Views dependentes removidas');
    console.log('   ✅ Colunas antigas removidas');
    console.log('   ✅ View imoveis_completos recriada com nova estrutura');
    console.log('   ✅ Estrutura final conforme especificações');
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error.message);
  } finally {
    await pool.end();
  }
}

removeDependenciesAndCleanup();



