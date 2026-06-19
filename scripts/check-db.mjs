import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

const result = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='public' AND table_name='system_prompt_templates'
  ORDER BY ordinal_position
`);
console.log('system_prompt_templates columns:', JSON.stringify(result.rows, null, 2));

// Also check if table exists at all
const tbl = await pool.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name LIKE '%prompt%'
`);
console.log('Prompt-related tables:', JSON.stringify(tbl.rows, null, 2));

await pool.end();
