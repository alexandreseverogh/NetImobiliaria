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

// Check unique constraints on system_prompt_templates
const constraints = await pool.query(`
  SELECT conname, contype, pg_get_constraintdef(oid)
  FROM pg_constraint
  WHERE conrelid = 'public.system_prompt_templates'::regclass
`);
console.log('Constraints:', JSON.stringify(constraints.rows, null, 2));

// Check a sample row
const sample = await pool.query(`SELECT * FROM public.system_prompt_templates LIMIT 3`);
console.log('Sample rows:', JSON.stringify(sample.rows, null, 2));

await pool.end();
