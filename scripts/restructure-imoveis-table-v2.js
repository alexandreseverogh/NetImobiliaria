const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: '[PASSWORD_REMOVED]'
});

async function restructureImoveisTable() {
  try {
    console.log('🔄 Iniciando reestruturação da tabela imoveis (versão 2)...\n');
    
    // 1. Esvaziar a tabela imoveis
    console.log('1. Esvaziando tabela imoveis...');
    await pool.query('DELETE FROM imoveis');
    console.log('✅ Tabela imoveis esvaziada');
    
    // 2. Criar tabelas de referência se não existirem
    console.log('\n2. Criando tabelas de referência...');
    
    // Tabela de estados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS estados (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        sigla CHAR(2) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela estados criada/verificada');
    
    // Tabela de cidades
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cidades (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        estado_id INTEGER REFERENCES estados(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela cidades criada/verificada');
    
    // 3. Adicionar novas colunas de chaves estrangeiras
    console.log('\n3. Adicionando colunas de chaves estrangeiras...');
    
    // estado_fk
    await pool.query(`
      ALTER TABLE imoveis 
      ADD COLUMN IF NOT EXISTS estado_fk INTEGER REFERENCES estados(id)
    `);
    console.log('✅ Coluna estado_fk adicionada');
    
    // cidade_fk
    await pool.query(`
      ALTER TABLE imoveis 
      ADD COLUMN IF NOT EXISTS cidade_fk INTEGER REFERENCES cidades(id)
    `);
    console.log('✅ Coluna cidade_fk adicionada');
    
    // finalidade_fk (renomear finalidade_id existente)
    await pool.query(`
      ALTER TABLE imoveis 
      RENAME COLUMN finalidade_id TO finalidade_fk
    `);
    console.log('✅ Coluna finalidade_fk renomeada');
    
    // tipo_fk (renomear tipo_id existente)
    await pool.query(`
      ALTER TABLE imoveis 
      RENAME COLUMN tipo_id TO tipo_fk
    `);
    console.log('✅ Coluna tipo_fk renomeada');
    
    // 4. Adicionar nova coluna numero
    console.log('\n4. Adicionando coluna numero...');
    await pool.query(`
      ALTER TABLE imoveis 
      ADD COLUMN IF NOT EXISTS numero VARCHAR(20)
    `);
    console.log('✅ Coluna numero adicionada');
    
    // 5. Alterar tipo da coluna codigo para string (se necessário)
    console.log('\n5. Verificando tipo da coluna codigo...');
    const codigoType = await pool.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' AND column_name = 'codigo'
    `);
    
    if (codigoType.rows[0]?.data_type !== 'character varying') {
      await pool.query(`
        ALTER TABLE imoveis 
        ALTER COLUMN codigo TYPE VARCHAR(50)
      `);
      console.log('✅ Coluna codigo alterada para VARCHAR');
    } else {
      console.log('✅ Coluna codigo já é do tipo VARCHAR');
    }
    
    // 6. Adicionar coluna status
    console.log('\n6. Adicionando coluna status...');
    await pool.query(`
      ALTER TABLE imoveis 
      ADD COLUMN IF NOT EXISTS status VARCHAR(50)
    `);
    console.log('✅ Coluna status adicionada');
    
    // 7. Remover colunas antigas de estado e cidade (se existirem)
    console.log('\n7. Removendo colunas antigas de estado e cidade...');
    await pool.query(`
      ALTER TABLE imoveis 
      DROP COLUMN IF EXISTS estado
    `);
    console.log('✅ Coluna estado removida');
    
    await pool.query(`
      ALTER TABLE imoveis 
      DROP COLUMN IF EXISTS cidade
    `);
    console.log('✅ Coluna cidade removida');
    
    // 8. Remover coluna status_id antiga
    console.log('\n8. Removendo coluna status_id antiga...');
    await pool.query(`
      ALTER TABLE imoveis 
      DROP COLUMN IF EXISTS status_id
    `);
    console.log('✅ Coluna status_id removida');
    
    // 9. Tentar remover colunas de proprietário (pode falhar se houver dependências)
    console.log('\n9. Tentando remover colunas de proprietário...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP COLUMN IF EXISTS proprietario_nome
      `);
      console.log('✅ Coluna proprietario_nome removida');
    } catch (error) {
      console.log('⚠️  Coluna proprietario_nome não pôde ser removida (dependências):', error.message);
    }
    
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP COLUMN IF EXISTS proprietario_telefone
      `);
      console.log('✅ Coluna proprietario_telefone removida');
    } catch (error) {
      console.log('⚠️  Coluna proprietario_telefone não pôde ser removida (dependências):', error.message);
    }
    
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP COLUMN IF EXISTS proprietario_email
      `);
      console.log('✅ Coluna proprietario_email removida');
    } catch (error) {
      console.log('⚠️  Coluna proprietario_email não pôde ser removida (dependências):', error.message);
    }
    
    // 10. Tentar remover coluna ativo
    console.log('\n10. Tentando remover coluna ativo...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP COLUMN IF EXISTS ativo
      `);
      console.log('✅ Coluna ativo removida');
    } catch (error) {
      console.log('⚠️  Coluna ativo não pôde ser removida (dependências):', error.message);
    }
    
    // 11. Criar índices para performance
    console.log('\n11. Criando índices para performance...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_imoveis_estado_fk ON imoveis(estado_fk)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_fk ON imoveis(cidade_fk)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_imoveis_finalidade_fk ON imoveis(finalidade_fk)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_imoveis_tipo_fk ON imoveis(tipo_fk)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_imoveis_status ON imoveis(status)
    `);
    console.log('✅ Índices criados');
    
    // 12. Inserir dados iniciais nas tabelas de referência
    console.log('\n12. Inserindo dados iniciais...');
    
    // Estados
    await pool.query(`
      INSERT INTO estados (nome, sigla) VALUES
      ('São Paulo', 'SP'),
      ('Rio de Janeiro', 'RJ'),
      ('Minas Gerais', 'MG'),
      ('Bahia', 'BA'),
      ('Paraná', 'PR'),
      ('Santa Catarina', 'SC')
      ON CONFLICT (sigla) DO NOTHING
    `);
    console.log('✅ Estados inseridos');
    
    // Cidades
    await pool.query(`
      INSERT INTO cidades (nome, estado_id) VALUES
      ('São Paulo', (SELECT id FROM estados WHERE sigla = 'SP')),
      ('Rio de Janeiro', (SELECT id FROM estados WHERE sigla = 'RJ')),
      ('Belo Horizonte', (SELECT id FROM estados WHERE sigla = 'MG')),
      ('Salvador', (SELECT id FROM estados WHERE sigla = 'BA')),
      ('Curitiba', (SELECT id FROM estados WHERE sigla = 'PR')),
      ('Florianópolis', (SELECT id FROM estados WHERE sigla = 'SC'))
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Cidades inseridas');
    
    // 13. Verificar estrutura final da tabela
    console.log('\n13. Verificando estrutura final da tabela imoveis...');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estrutura final da tabela imoveis:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('\n🎉 Reestruturação da tabela imoveis concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante a reestruturação:', error.message);
  } finally {
    await pool.end();
  }
}

restructureImoveisTable();



