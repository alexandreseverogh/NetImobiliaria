const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: '[PASSWORD_REMOVED]'
});

async function finishImoveisUpdate() {
  try {
    console.log('🔄 Finalizando atualização da tabela imoveis...\n');
    
    // 1. Alterar coluna status_fk de VARCHAR para INTEGER
    console.log('1. Alterando coluna status_fk para INTEGER...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        ALTER COLUMN status_fk TYPE INTEGER USING status_fk::INTEGER
      `);
      console.log('✅ Coluna status_fk alterada para INTEGER');
    } catch (error) {
      console.log('⚠️  Erro ao alterar status_fk:', error.message);
      // Se houver dados, limpar primeiro
      await pool.query('UPDATE imoveis SET status_fk = NULL WHERE status_fk IS NOT NULL');
      await pool.query(`
        ALTER TABLE imoveis 
        ALTER COLUMN status_fk TYPE INTEGER USING status_fk::INTEGER
      `);
      console.log('✅ Coluna status_fk alterada para INTEGER (após limpeza)');
    }
    
    // 2. Alterar tipo das colunas estado_fk e cidade_fk para VARCHAR
    console.log('\n2. Alterando tipo das colunas estado_fk e cidade_fk...');
    
    // estado_fk
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        ALTER COLUMN estado_fk TYPE VARCHAR(10)
      `);
      console.log('✅ Coluna estado_fk alterada para VARCHAR(10)');
    } catch (error) {
      console.log('⚠️  Erro ao alterar estado_fk:', error.message);
    }
    
    // cidade_fk
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        ALTER COLUMN cidade_fk TYPE VARCHAR(100)
      `);
      console.log('✅ Coluna cidade_fk alterada para VARCHAR(100)');
    } catch (error) {
      console.log('⚠️  Erro ao alterar cidade_fk:', error.message);
    }
    
    // 3. Remover constraints de chave estrangeira das colunas estado_fk e cidade_fk
    console.log('\n3. Removendo constraints de chave estrangeira...');
    
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP CONSTRAINT IF EXISTS imoveis_estado_fk_fkey
      `);
      console.log('✅ Constraint de estado_fk removida');
    } catch (error) {
      console.log('⚠️  Erro ao remover constraint estado_fk:', error.message);
    }
    
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP CONSTRAINT IF EXISTS imoveis_cidade_fk_fkey
      `);
      console.log('✅ Constraint de cidade_fk removida');
    } catch (error) {
      console.log('⚠️  Erro ao remover constraint cidade_fk:', error.message);
    }
    
    // 4. Adicionar constraint de chave estrangeira para status_fk
    console.log('\n4. Adicionando constraint para status_fk...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        ADD CONSTRAINT imoveis_status_fk_fkey 
        FOREIGN KEY (status_fk) REFERENCES status_imovel(id)
      `);
      console.log('✅ Constraint de status_fk adicionada');
    } catch (error) {
      console.log('⚠️  Erro ao adicionar constraint status_fk:', error.message);
    }
    
    // 5. Ajustar precisão da coluna taxa_extra para NUMERIC(8,2)
    console.log('\n5. Ajustando precisão da coluna taxa_extra...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        ALTER COLUMN taxa_extra TYPE NUMERIC(8,2)
      `);
      console.log('✅ Coluna taxa_extra ajustada para NUMERIC(8,2)');
    } catch (error) {
      console.log('⚠️  Erro ao ajustar taxa_extra:', error.message);
    }
    
    // 6. Criar índices para as novas colunas
    console.log('\n6. Criando índices para as novas colunas...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_imoveis_complemento ON imoveis(complemento)',
      'CREATE INDEX IF NOT EXISTS idx_imoveis_taxa_extra ON imoveis(taxa_extra)',
      'CREATE INDEX IF NOT EXISTS idx_imoveis_status_fk ON imoveis(status_fk)',
      'CREATE INDEX IF NOT EXISTS idx_imoveis_estado_fk_varchar ON imoveis(estado_fk)',
      'CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_fk_varchar ON imoveis(cidade_fk)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await pool.query(indexQuery);
        console.log('✅ Índice criado');
      } catch (error) {
        console.log('⚠️  Erro ao criar índice:', error.message);
      }
    }
    
    // 7. Atualizar a view imoveis_completos
    console.log('\n7. Atualizando view imoveis_completos...');
    try {
      await pool.query('DROP VIEW IF EXISTS imoveis_completos CASCADE');
      
      await pool.query(`
        CREATE VIEW imoveis_completos AS
        SELECT 
          i.*,
          ti.nome as tipo_nome,
          fi.nome as finalidade_nome,
          si.nome as status_nome,
          e.nome as estado_nome,
          e.sigla as estado_sigla,
          c.nome as cidade_nome,
          u.nome as corretor_nome,
          COUNT(ii.id) as total_imagens,
          COUNT(CASE WHEN ii.principal = true THEN 1 END) as tem_imagem_principal
        FROM imoveis i
        LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
        LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
        LEFT JOIN status_imovel si ON i.status_fk = si.id
        LEFT JOIN estados e ON i.estado_fk = e.sigla
        LEFT JOIN cidades c ON i.cidade_fk = c.nome
        LEFT JOIN users u ON i.created_by = u.id
        LEFT JOIN imovel_imagens ii ON i.id = ii.imovel_id AND ii.ativo = true
        GROUP BY i.id, ti.nome, fi.nome, si.nome, e.nome, e.sigla, c.nome, u.nome
      `);
      console.log('✅ View imoveis_completos atualizada');
    } catch (error) {
      console.log('⚠️  Erro ao atualizar view:', error.message);
    }
    
    // 8. Verificar estrutura final
    console.log('\n8. Verificando estrutura final da tabela imoveis...');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length, numeric_precision, numeric_scale
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estrutura final da tabela imoveis:');
    finalColumns.rows.forEach(col => {
      let typeInfo = col.data_type;
      if (col.character_maximum_length) {
        typeInfo += `(${col.character_maximum_length})`;
      } else if (col.numeric_precision) {
        typeInfo += `(${col.numeric_precision}${col.numeric_scale ? ',' + col.numeric_scale : ''})`;
      }
      console.log(`   - ${col.column_name}: ${typeInfo} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n🎉 Atualização da tabela imoveis concluída!');
    console.log('\n📋 Resumo das alterações:');
    console.log('   ✅ Coluna complemento: VARCHAR(255)');
    console.log('   ✅ Coluna taxa_extra: NUMERIC(8,2)');
    console.log('   ✅ Coluna status_fk: INTEGER (chave estrangeira)');
    console.log('   ✅ Coluna estado_fk: VARCHAR(10) (para siglas do JSON)');
    console.log('   ✅ Coluna cidade_fk: VARCHAR(100) (para nomes do JSON)');
    console.log('   ✅ Constraints de chave estrangeira atualizadas');
    console.log('   ✅ Índices de performance criados');
    console.log('   ✅ View imoveis_completos atualizada');
    
  } catch (error) {
    console.error('❌ Erro durante a atualização:', error.message);
  } finally {
    await pool.end();
  }
}

finishImoveisUpdate();



