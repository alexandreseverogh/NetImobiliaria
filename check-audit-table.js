const { Pool } = require('pg');

async function checkAuditTable() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
  });

  try {
    console.log('🔍 Verificando tabela audit_logs...');
    
    // Verificar se a tabela existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `);
    
    console.log('Tabela audit_logs existe:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Verificar estrutura da tabela
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs'
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Estrutura da tabela audit_logs:');
      structure.rows.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Contar registros
      const count = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
      console.log(`\n📊 Total de registros: ${count.rows[0].total}`);
      
      // Mostrar alguns registros de exemplo
      if (parseInt(count.rows[0].total) > 0) {
        const sample = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 3');
        console.log('\n📝 Últimos 3 registros:');
        sample.rows.forEach((row, index) => {
          console.log(`${index + 1}. ${row.action} - ${row.resource} - ${row.created_at}`);
        });
      }
    } else {
      console.log('❌ Tabela audit_logs não existe!');
      console.log('Criando tabela audit_logs...');
      
      const createTable = await pool.query(`
        CREATE TABLE audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          action VARCHAR(50) NOT NULL,
          resource VARCHAR(100) NOT NULL,
          resource_id VARCHAR(100),
          details JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ Tabela audit_logs criada com sucesso!');
      
      // Criar índices
      await pool.query('CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);');
      await pool.query('CREATE INDEX idx_audit_logs_action ON audit_logs(action);');
      await pool.query('CREATE INDEX idx_audit_logs_resource ON audit_logs(resource);');
      await pool.query('CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);');
      
      console.log('✅ Índices criados com sucesso!');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

checkAuditTable();




