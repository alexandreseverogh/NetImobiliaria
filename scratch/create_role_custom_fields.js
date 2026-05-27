const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria'
});

async function createTable() {
  const client = await pool.connect();
  try {
    console.log('🚀 Iniciando criação da tabela role_custom_fields...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_custom_fields (
          id SERIAL PRIMARY KEY,
          role_id INTEGER REFERENCES user_roles(id) ON DELETE CASCADE,
          field_name VARCHAR(50) NOT NULL,
          field_label VARCHAR(100) NOT NULL,
          field_type VARCHAR(20) DEFAULT 'text',
          mask VARCHAR(50),
          is_required BOOLEAN DEFAULT false,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tabela role_custom_fields criada com sucesso!');
    
    // Aproveitar para garantir que o índice existe para performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_role_custom_fields_role_id ON role_custom_fields(role_id);`);
    console.log('✅ Índice idx_role_custom_fields_role_id criado!');

  } catch (err) {
    console.error('❌ Erro ao criar tabela:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

createTable();
