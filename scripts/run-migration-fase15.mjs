/**
 * Runner para FASE 15 — AgentHeartbeat + benchmark agent_confidence_min
 * Uso: node scripts/run-migration-fase15.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function run() {
  const sqlPath = join(__dirname, '..', 'prisma', 'migration-2026-06-03-fase15-agent-heartbeat.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('⏳ Aplicando migration FASE 15 — AgentHeartbeat...');
  try {
    await pool.query(sql);
    console.log('✅ Migration aplicada com sucesso.');
  } catch (err) {
    console.error('❌ Erro na migration:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
