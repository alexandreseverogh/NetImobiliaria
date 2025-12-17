// Script para testar conexão com o banco de dados
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
  database: process.env.DB_NAME || 'net_imobiliaria',
});

async function testConnection() {
  console.log('🔍 Testando conexão com o banco de dados...\n');

  try {
    // Testar conexão básica
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso');
    
    // Testar consulta simples
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✅ Consulta básica funcionando:', result.rows[0]);
    
    // Testar se as tabelas existem
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'user_roles', 'user_role_assignments')
      ORDER BY table_name
    `;
    
    const tablesResult = await client.query(tablesQuery);
    console.log('✅ Tabelas encontradas:', tablesResult.rows.map(r => r.table_name));
    
    // Testar consulta específica do endpoint
    const testQuery = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.nome,
        u.telefone,
        u.ativo,
        u.ultimo_login,
        u.created_at,
        ura.assigned_at,
        ura.assigned_by,
        ura.is_primary,
        assigned_by_user.username as assigned_by_username
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN users assigned_by_user ON ura.assigned_by = assigned_by_user.id
      WHERE ura.role_id = $1
      ORDER BY u.nome
      LIMIT 5
    `;
    
    console.log('\n🔍 Testando consulta específica do endpoint...');
    const testResult = await client.query(testQuery, [22]); // ID do perfil "Gerente 2FA Teste"
    console.log('✅ Consulta específica funcionando:', testResult.rows.length, 'usuários encontrados');
    
    if (testResult.rows.length > 0) {
      console.log('📋 Primeiro usuário encontrado:', testResult.rows[0]);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.error('📋 Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

testConnection();


