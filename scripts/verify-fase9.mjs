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

const tbl = await pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_schema='campanhasmarketingdigital' AND table_name='AuditReport'
  ORDER BY ordinal_position
`);
console.log('AuditReport columns:', tbl.rows.map(r => r.column_name).join(', '));

const templates = await pool.query(`
  SELECT template_key, title FROM public.system_prompt_templates
  WHERE template_key LIKE 'audit_report%'
`);
console.log('Prompt templates:', JSON.stringify(templates.rows));

await pool.end();
