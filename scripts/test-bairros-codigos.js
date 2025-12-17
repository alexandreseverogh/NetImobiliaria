const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: '[PASSWORD_REMOVED]'
});

async function testBairrosCodigos() {
  try {
    console.log('🔍 Testando consultas de bairros e códigos...\n');
    
    // 1. Verificar estrutura da tabela imoveis
    console.log('1. Verificando estrutura da tabela imoveis...');
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'imoveis' 
      AND column_name IN ('bairro', 'codigo')
      ORDER BY column_name
    `);
    
    console.log('Colunas encontradas:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    // 2. Testar consulta de bairros
    console.log('\n2. Testando consulta de bairros...');
    try {
      const bairrosResult = await pool.query(`
        SELECT DISTINCT bairro 
        FROM imoveis 
        WHERE bairro IS NOT NULL 
        AND bairro != '' 
        ORDER BY bairro ASC
        LIMIT 10
      `);
      console.log('✅ Consulta de bairros funcionou');
      console.log('Bairros encontrados:', bairrosResult.rows.map(row => row.bairro));
    } catch (error) {
      console.log('❌ Erro na consulta de bairros:', error.message);
    }
    
    // 3. Testar consulta de códigos
    console.log('\n3. Testando consulta de códigos...');
    try {
      const codigosResult = await pool.query(`
        SELECT DISTINCT codigo 
        FROM imoveis 
        WHERE codigo IS NOT NULL 
        AND codigo != '' 
        ORDER BY codigo ASC
        LIMIT 10
      `);
      console.log('✅ Consulta de códigos funcionou');
      console.log('Códigos encontrados:', codigosResult.rows.map(row => row.codigo));
    } catch (error) {
      console.log('❌ Erro na consulta de códigos:', error.message);
    }
    
    // 4. Verificar se há dados na tabela
    console.log('\n4. Verificando dados na tabela imoveis...');
    const countResult = await pool.query('SELECT COUNT(*) as total FROM imoveis');
    console.log(`Total de registros na tabela imoveis: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await pool.end();
  }
}

testBairrosCodigos();



