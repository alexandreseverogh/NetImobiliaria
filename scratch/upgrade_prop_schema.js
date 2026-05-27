const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

async function addSemanticColumn() {
  try {
    console.log('--- Evoluindo Esquema: Adicionando semantic_data ---');
    await pool.query(`
      ALTER TABLE proprietarios 
      ADD COLUMN IF NOT EXISTS semantic_data JSONB DEFAULT '{}'::jsonb
    `);
    console.log('✅ Coluna semantic_data adicionada com sucesso!');
    
    // Opcional: Migrar dados existentes se necessário (neste caso está vazio)
    
  } catch (err) {
    console.error('❌ Erro ao evoluir esquema:', err);
  } finally {
    await pool.end();
  }
}

addSemanticColumn();
