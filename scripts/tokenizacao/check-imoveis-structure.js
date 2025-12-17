const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: '[PASSWORD_REMOVED]'
});

async function checkImoveisStructure() {
  try {
    console.log('🔍 Verificando estrutura atual da tabela imoveis...\n');
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas atuais da tabela imoveis:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkImoveisStructure();



