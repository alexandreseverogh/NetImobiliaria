const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: '[PASSWORD_REMOVED]'
});

async function checkCurrentStructure() {
  try {
    console.log('🔍 Verificando estrutura atual da tabela imoveis...\n');
    
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas atuais da tabela imoveis:');
    columns.rows.forEach(col => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`   - ${col.column_name}: ${col.data_type}${length} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkCurrentStructure();



