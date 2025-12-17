const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'Roberto@2007',
  database: 'net_imobiliaria',
});

async function testUltimoLogin() {
  const client = await pool.connect();
  try {
    console.log('🔍 Testando campo ultimo_login...\n');
    
    // 1. Verificar se o campo existe
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'ultimo_login'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('❌ Campo ultimo_login não existe na tabela users');
      console.log('🔧 Criando campo...');
      
      await client.query(`
        ALTER TABLE users ADD COLUMN ultimo_login TIMESTAMP
      `);
      
      console.log('✅ Campo ultimo_login criado com sucesso');
    } else {
      console.log('✅ Campo ultimo_login já existe:');
      console.log(`   Tipo: ${columnCheck.rows[0].data_type}`);
      console.log(`   Nullable: ${columnCheck.rows[0].is_nullable}`);
    }
    
    // 2. Verificar dados atuais
    const currentData = await client.query(`
      SELECT id, username, ultimo_login 
      FROM users 
      ORDER BY id
    `);
    
    console.log('\n📊 Dados atuais dos usuários:');
    currentData.rows.forEach(user => {
      console.log(`   ID ${user.id}: ${user.username} - Último login: ${user.ultimo_login || 'Nunca'}`);
    });
    
    // 3. Simular atualização de último login
    console.log('\n🔧 Simulando atualização de último login...');
    
    const updateResult = await client.query(`
      UPDATE users 
      SET ultimo_login = NOW() 
      WHERE username = 'admin'
      RETURNING id, username, ultimo_login
    `);
    
    if (updateResult.rows.length > 0) {
      const updatedUser = updateResult.rows[0];
      console.log(`✅ Último login atualizado para ${updatedUser.username}: ${updatedUser.ultimo_login}`);
    } else {
      console.log('❌ Usuário admin não encontrado');
    }
    
    // 4. Verificar dados após atualização
    const updatedData = await client.query(`
      SELECT id, username, ultimo_login 
      FROM users 
      WHERE username = 'admin'
    `);
    
    console.log('\n📊 Dados após atualização:');
    updatedData.rows.forEach(user => {
      console.log(`   ID ${user.id}: ${user.username} - Último login: ${user.ultimo_login}`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testUltimoLogin();


