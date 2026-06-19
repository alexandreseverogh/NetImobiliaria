const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Arquivo .env.local não encontrado no diretório atual!');
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
  
  // Usar variáveis explícitas de conexão ou URL
  const poolConfig = env.MARKETING_DATABASE_URL 
    ? { connectionString: env.MARKETING_DATABASE_URL.split('?')[0] }
    : {
        host: env.DB_HOST || '127.0.0.1',
        port: parseInt(env.DB_PORT || '15432'),
        database: env.DB_NAME || 'net_imobiliaria',
        user: env.DB_USER || 'postgres',
        password: env.DB_PASSWORD || 'postgres',
      };
      
  const newToken = env.META_ACCESS_TOKEN;
  if (!newToken) {
    console.error('❌ Variável META_ACCESS_TOKEN não encontrada no .env.local!');
    process.exit(1);
  }
  
  console.log('🔄 Sincronizando novo token com o Banco de Dados...');
  console.log('Conectando ao banco...');
  const pool = new Pool(poolConfig);
  
  try {
    // 1. Atualizar tenant_network_credentials
    const credentialsRes = await pool.query(`SELECT id, credentials, tenant_id FROM public.tenant_network_credentials`);
    let tncUpdated = 0;
    
    for (const row of credentialsRes.rows) {
      if (row.credentials && typeof row.credentials === 'object') {
        const oldToken = row.credentials.access_token;
        if (oldToken && oldToken !== newToken) {
          row.credentials.access_token = newToken;
          await pool.query(
            `UPDATE public.tenant_network_credentials SET credentials = $1 WHERE id = $2`,
            [JSON.stringify(row.credentials), row.id]
          );
          tncUpdated++;
        }
      }
    }
    console.log(`✅ Atualizado ${tncUpdated} registro(s) em tenant_network_credentials.`);
    
    // 2. Atualizar tabela legacy tenants
    const tenantsRes = await pool.query(
      `UPDATE public.tenants SET meta_token = $1 WHERE meta_token IS NOT NULL AND meta_token <> '' AND meta_token <> $1`,
      [newToken]
    );
    console.log(`✅ Atualizado ${tenantsRes.rowCount} registro(s) na tabela tenants.`);
    
    console.log('\n🎉 Sincronização concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro durante a sincronização:', err.message);
  } finally {
    await pool.end();
  }
}

run();
