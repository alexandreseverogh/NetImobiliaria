const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria'
});

async function verificarTiposDados() {
  try {
    console.log('🔍 Verificando tipos de dados das tabelas...\n');

    // 1. Verificar estrutura da tabela system_categorias
    console.log('1️⃣ Estrutura da tabela system_categorias:');
    const categoriasStructure = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'system_categorias'
      ORDER BY ordinal_position;
    `);

    console.log('Colunas encontradas:');
    categoriasStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 2. Verificar estrutura da tabela users
    console.log('\n2️⃣ Estrutura da tabela users:');
    const usersStructure = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('Colunas encontradas:');
    usersStructure.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 3. Verificar dados de exemplo
    console.log('\n3️⃣ Dados de exemplo:');
    
    console.log('system_categorias:');
    const categoriasSample = await pool.query('SELECT id, name, created_by FROM system_categorias LIMIT 3');
    categoriasSample.rows.forEach(row => {
      console.log(`- ID: ${row.id} (${typeof row.id}), Name: ${row.name}, created_by: ${row.created_by} (${typeof row.created_by})`);
    });

    console.log('\nusers:');
    const usersSample = await pool.query('SELECT id, username FROM users LIMIT 3');
    usersSample.rows.forEach(row => {
      console.log(`- ID: ${row.id} (${typeof row.id}), Username: ${row.username}`);
    });

    // 4. Testar JOIN sem conversão de tipo
    console.log('\n4️⃣ Testando JOIN sem conversão:');
    try {
      const testQuery = `
        SELECT 
          c.id,
          c.name,
          c.created_by,
          u.id as user_id,
          u.username
        FROM system_categorias c
        LEFT JOIN users u ON c.created_by = u.id
        LIMIT 3
      `;
      
      const testResult = await pool.query(testQuery);
      console.log(`✅ JOIN executado com sucesso: ${testResult.rows.length} registros`);
      testResult.rows.forEach(row => {
        console.log(`- Categoria: ${row.name}, User: ${row.username || 'NULL'}`);
      });
    } catch (joinError) {
      console.log(`❌ Erro no JOIN: ${joinError.message}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  } finally {
    await pool.end();
  }
}

verificarTiposDados();
