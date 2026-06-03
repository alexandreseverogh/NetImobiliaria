/**
 * FASE 14d — Auto-classificação de ângulo em lote.
 * Executa as duas migrations SQL locais (angle_source + classify_campaign_angle prompt).
 *
 * Uso: node scripts/run-migration-fase14d.mjs
 * OU: cole o SQL diretamente no DBeaver.
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  host:     '127.0.0.1',
  port:     15432,
  database: 'net_imobiliaria',
  user:     'postgres',
  password: 'postgres',
  ssl:      false,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sql1 = readFileSync(
      join(__dirname, '../prisma/migration-2026-06-03-angle-source.sql'),
      'utf-8',
    );
    await client.query(sql1);
    console.log('✅ [1/2] Coluna angle_source adicionada à Campaign');

    const sql2 = readFileSync(
      join(__dirname, '../prisma/migration-2026-06-03-classify-angle-prompt.sql'),
      'utf-8',
    );
    await client.query(sql2);
    console.log('✅ [2/2] Template classify_campaign_angle inserido');

    await client.query('COMMIT');
    console.log('\n✅ FASE 14d — migrations concluídas com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration falhou:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
