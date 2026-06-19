const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local não encontrado');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = (match[2] || '').replace(/\r$/, '').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      env[match[1]] = value;
    }
  });
  return env;
}

async function run() {
  const env = loadEnv();
  const dbUrl = env.MARKETING_DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:15432/net_imobiliaria';
  const connectionString = dbUrl.split('?')[0];
  
  console.log('Connecting to database...');
  const pool = new Pool({ connectionString });
  
  try {
    // 1. Run SQL Migration file DDL
    console.log('Running SQL DDL migration...');
    const sqlPath = path.join(process.cwd(), 'prisma', 'migration-2026-06-18-tenants-meta-and-agents.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sqlContent);
    console.log('✅ DDL Migration and Meta backfill completed successfully.');
    
    // 2. Seeding/Backfilling agent configurations from .env.local for all existing tenants
    console.log('Backfilling environment variables for existing tenants...');
    const tenantsRes = await pool.query('SELECT id, slug FROM public.tenants');
    
    const confidenceThreshold = parseFloat(env.AGENT_CONFIDENCE_THRESHOLD || '0.85');
    
    for (const tenant of tenantsRes.rows) {
      console.log(`Updating tenant: ${tenant.slug} (${tenant.id})`);
      
      // Update with .env.local values as defaults
      await pool.query(
        `UPDATE public.tenants
         SET anthropic_api_key = COALESCE(anthropic_api_key, $2),
             slack_webhook_url = COALESCE(slack_webhook_url, $3),
             evolution_api_url = COALESCE(evolution_api_url, $4),
             evolution_api_key = COALESCE(evolution_api_key, $5),
             evolution_instance = COALESCE(evolution_instance, $6),
             agent_confidence_threshold = COALESCE(agent_confidence_threshold, $7)
         WHERE id = $1::uuid`,
        [
          tenant.id,
          env.ANTHROPIC_API_KEY || null,
          env.SLACK_WEBHOOK_URL || null,
          env.EVOLUTION_API_URL || null,
          env.EVOLUTION_API_KEY || null,
          env.EVOLUTION_INSTANCE || null,
          confidenceThreshold
        ]
      );
    }
    
    console.log('🎉 Seeding and Backfill completed successfully!');
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

run();
