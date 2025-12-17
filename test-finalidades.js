const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/net_imobiliaria'
});

async function testFinalidades() {
  try {
    console.log('Testando conexão com banco...');
    
    // Verificar se a tabela existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'finalidades_imovel'
      );
    `);
    
    console.log('Tabela finalidades_imovel existe:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Contar registros
      const countResult = await pool.query('SELECT COUNT(*) FROM finalidades_imovel');
      console.log('Total de finalidades:', countResult.rows[0].count);
      
      // Buscar todos os registros
      const finalidades = await pool.query('SELECT * FROM finalidades_imovel ORDER BY nome');
      console.log('Finalidades encontradas:', finalidades.rows);
    }
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await pool.end();
  }
}

testFinalidades();


