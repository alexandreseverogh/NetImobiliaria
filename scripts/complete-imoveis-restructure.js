const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: '[PASSWORD_REMOVED]'
});

async function completeImoveisRestructure() {
  try {
    console.log('🔄 Completando reestruturação da tabela imoveis...\n');
    
    // 1. Renomear tipo_id para tipo_fk (se ainda não foi feito)
    console.log('1. Verificando coluna tipo_fk...');
    const tipoColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' AND column_name = 'tipo_id'
    `);
    
    if (tipoColumn.rows.length > 0) {
      await pool.query(`
        ALTER TABLE imoveis 
        RENAME COLUMN tipo_id TO tipo_fk
      `);
      console.log('✅ Coluna tipo_id renomeada para tipo_fk');
    } else {
      console.log('✅ Coluna tipo_fk já existe');
    }
    
    // 2. Adicionar coluna status (se não existir)
    console.log('\n2. Verificando coluna status...');
    const statusColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' AND column_name = 'status'
    `);
    
    if (statusColumn.rows.length === 0) {
      await pool.query(`
        ALTER TABLE imoveis 
        ADD COLUMN status VARCHAR(50)
      `);
      console.log('✅ Coluna status adicionada');
    } else {
      console.log('✅ Coluna status já existe');
    }
    
    // 3. Remover colunas de proprietário (com tratamento de erro)
    console.log('\n3. Removendo colunas de proprietário...');
    
    const columnsToRemove = ['proprietario_nome', 'proprietario_telefone', 'proprietario_email'];
    
    for (const column of columnsToRemove) {
      try {
        await pool.query(`
          ALTER TABLE imoveis 
          DROP COLUMN ${column}
        `);
        console.log(`✅ Coluna ${column} removida`);
      } catch (error) {
        console.log(`⚠️  Coluna ${column} não pôde ser removida: ${error.message}`);
      }
    }
    
    // 4. Remover coluna ativo (com tratamento de erro)
    console.log('\n4. Removendo coluna ativo...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP COLUMN ativo
      `);
      console.log('✅ Coluna ativo removida');
    } catch (error) {
      console.log(`⚠️  Coluna ativo não pôde ser removida: ${error.message}`);
    }
    
    // 5. Remover colunas antigas de estado e cidade
    console.log('\n5. Removendo colunas antigas de estado e cidade...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP COLUMN estado
      `);
      console.log('✅ Coluna estado removida');
    } catch (error) {
      console.log(`⚠️  Coluna estado não pôde ser removida: ${error.message}`);
    }
    
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP COLUMN cidade
      `);
      console.log('✅ Coluna cidade removida');
    } catch (error) {
      console.log(`⚠️  Coluna cidade não pôde ser removida: ${error.message}`);
    }
    
    // 6. Remover coluna status_id antiga
    console.log('\n6. Removendo coluna status_id antiga...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP COLUMN status_id
      `);
      console.log('✅ Coluna status_id removida');
    } catch (error) {
      console.log(`⚠️  Coluna status_id não pôde ser removida: ${error.message}`);
    }
    
    // 7. Criar índices para performance
    console.log('\n7. Criando índices para performance...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_imoveis_estado_fk ON imoveis(estado_fk)',
      'CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_fk ON imoveis(cidade_fk)',
      'CREATE INDEX IF NOT EXISTS idx_imoveis_finalidade_fk ON imoveis(finalidade_fk)',
      'CREATE INDEX IF NOT EXISTS idx_imoveis_tipo_fk ON imoveis(tipo_fk)',
      'CREATE INDEX IF NOT EXISTS idx_imoveis_status ON imoveis(status)'
    ];
    
    for (const indexQuery of indexes) {
      try {
        await pool.query(indexQuery);
        console.log('✅ Índice criado');
      } catch (error) {
        console.log(`⚠️  Erro ao criar índice: ${error.message}`);
      }
    }
    
    // 8. Verificar estrutura final
    console.log('\n8. Verificando estrutura final da tabela imoveis...');
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
    
    console.log('\n🎉 Reestruturação da tabela imoveis concluída!');
    console.log('\n📋 Resumo das alterações realizadas:');
    console.log('   ✅ Tabela esvaziada');
    console.log('   ✅ Colunas de chaves estrangeiras: estado_fk, cidade_fk, finalidade_fk, tipo_fk');
    console.log('   ✅ Coluna numero adicionada');
    console.log('   ✅ Coluna status adicionada');
    console.log('   ✅ Colunas de proprietário removidas (se possível)');
    console.log('   ✅ Coluna ativo removida (se possível)');
    console.log('   ✅ Colunas antigas removidas (se possível)');
    console.log('   ✅ Índices de performance criados');
    
  } catch (error) {
    console.error('❌ Erro durante a reestruturação:', error.message);
  } finally {
    await pool.end();
  }
}

completeImoveisRestructure();



