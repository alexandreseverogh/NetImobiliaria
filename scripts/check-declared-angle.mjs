import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');
const pool = new Pool({ user:'postgres', host:'127.0.0.1', database:'net_imobiliaria', password:'postgres', port:15432 });
try {
  // 1) coluna existe e aceita valor
  const col = await pool.query(`SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_schema='campanhasmarketingdigital' AND table_name='Campaign' AND column_name='declared_angle'`);
  // 2) índice existe
  const idx = await pool.query(`SELECT indexname FROM pg_indexes
    WHERE schemaname='campanhasmarketingdigital' AND tablename='Campaign' AND indexname='idx_campaign_declared_angle'`);
  console.log('column:', JSON.stringify(col.rows));
  console.log('index :', JSON.stringify(idx.rows));
} catch(e){ console.error('ERR', e.message); process.exit(1); }
finally { await pool.end(); }
