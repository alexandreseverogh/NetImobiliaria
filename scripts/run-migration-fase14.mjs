import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

const sql = readFileSync(
  join(__dirname, '../prisma/migration-2026-06-03-campaign-declared-angle.sql'),
  'utf-8'
);

try {
  await pool.query(sql);
  // verifica
  const r = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'campanhasmarketingdigital'
      AND table_name = 'Campaign' AND column_name = 'declared_angle'
  `);
  console.log('✅ FASE 14 migration executed. Column:', JSON.stringify(r.rows));
} catch (e) {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
