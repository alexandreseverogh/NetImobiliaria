const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('--- FASE 1: EXPANSÃO DO ESQUEMA DE DADOS (SUPERPOWERS) - AJUSTADO ---');

    // 1. Evolução da tabela system_features
    console.log('1. Atualizando system_features com metadados de Skill...');
    await client.query(`
      ALTER TABLE public.system_features 
      ADD COLUMN IF NOT EXISTS is_skill BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS skill_type VARCHAR(50),
      ADD COLUMN IF NOT EXISTS skill_metadata JSONB DEFAULT '{}';
    `);

    // 2. Evolução da tabela tenant_feature_overrides
    console.log('2. Atualizando tenant_feature_overrides para suportar parametrização de Skill...');
    await client.query(`
      ALTER TABLE public.tenant_feature_overrides 
      ADD COLUMN IF NOT EXISTS skill_config JSONB DEFAULT '{}';
    `);

    // 3. Criação do Catálogo de Manifesto (system_skill_manifest)
    // NOTA: feature_id aqui deve ser INTEGER para bater com system_features.id
    console.log('3. Criando a tabela de Manifesto Global de Skills...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.system_skill_manifest (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feature_id INTEGER REFERENCES public.system_features(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(20) DEFAULT '1.0.0',
        author VARCHAR(255) DEFAULT 'Artemis Core',
        skill_icon VARCHAR(100),
        component_path VARCHAR(255),
        bridge_contract JSONB DEFAULT '{}',
        is_premium BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(feature_id)
      );
    `);

    // 4. Criação de índices para performance
    console.log('4. Otimizando com índices de performance...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_features_is_skill ON public.system_features(is_skill);
      CREATE INDEX IF NOT EXISTS idx_skill_manifest_feature ON public.system_skill_manifest(feature_id);
    `);

    await client.query('COMMIT');
    console.log('\n✅ SUCESSO: Fase 1 (Ajustada) concluída com êxito!');

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('\n❌ ERRO NA MIGRAÇÃO:', err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runMigration();
