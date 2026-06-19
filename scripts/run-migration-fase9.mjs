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
  join(__dirname, '../prisma/migration-2026-06-01-fase9-audit-report.sql'),
  'utf-8'
);

try {
  await pool.query(sql);
  console.log('✅ FASE 9 migration executed successfully');
} catch (e) {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
} finally {
  await pool.end();
}
