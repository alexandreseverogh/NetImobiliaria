const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: '[PASSWORD_REMOVED]'
});

async function removeAtivoColumn() {
  try {
    console.log('🔄 Tentando remover coluna ativo...\n');
    
    // 1. Verificar dependências da coluna ativo
    console.log('1. Verificando dependências da coluna ativo...');
    const dependencies = await pool.query(`
      SELECT 
        schemaname,
        viewname,
        definition
      FROM pg_views 
      WHERE definition LIKE '%ativo%'
    `);
    
    console.log('Views que usam a coluna ativo:');
    dependencies.rows.forEach(dep => {
      console.log(`   - ${dep.schemaname}.${dep.viewname}`);
    });
    
    // 2. Verificar triggers
    console.log('\n2. Verificando triggers...');
    const triggers = await pool.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'imoveis'
    `);
    
    console.log('Triggers na tabela imoveis:');
    triggers.rows.forEach(trigger => {
      console.log(`   - ${trigger.trigger_name}: ${trigger.event_manipulation}`);
    });
    
    // 3. Tentar remover a coluna ativo novamente
    console.log('\n3. Tentando remover coluna ativo...');
    try {
      await pool.query(`
        ALTER TABLE imoveis 
        DROP COLUMN ativo
      `);
      console.log('✅ Coluna ativo removida com sucesso!');
    } catch (error) {
      console.log('❌ Erro ao remover coluna ativo:', error.message);
      
      // 4. Se não conseguir remover, pelo menos torná-la nullable e com valor padrão
      console.log('\n4. Tornando coluna ativo nullable...');
      try {
        await pool.query(`
          ALTER TABLE imoveis 
          ALTER COLUMN ativo DROP NOT NULL
        `);
        console.log('✅ Coluna ativo tornada nullable');
      } catch (error2) {
        console.log('⚠️  Não foi possível tornar ativo nullable:', error2.message);
      }
    }
    
    // 5. Verificar estrutura final
    console.log('\n5. Estrutura final da tabela imoveis:');
    const finalColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Colunas finais:');
    finalColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

removeAtivoColumn();



