import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria',
  password: 'postgres', port: 15432,
});

const FEATURE_ID = 101; // system_features id for Auditoria

// 0. Check permissions columns
const cols = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='permissions'
  ORDER BY ordinal_position
`);
console.log('=== permissions columns ===', cols.rows.map(r => r.column_name).join(', '));

// 1. Check permissions for desperdicio (id=97) as reference
const perms97 = await pool.query(`SELECT * FROM public.permissions WHERE feature_id = 97`);
console.log('\n=== permissions for desperdicio (97) ===');
console.log(JSON.stringify(perms97.rows, null, 2));

// 2. Add tenant_feature_overrides for both tenants (mirror desperdicio)
const tenants = [
  'c828d003-6213-4464-aa38-6c5d10a0aa9a',  // Imobiliaria XYZ
  'efbf62cf-9e28-4b31-a4f6-82a037412353',  // Marketing Digital
];

for (const tenantId of tenants) {
  const r = await pool.query(`
    INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active, created_at, updated_at)
    SELECT $1, $2, true, NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tenant_feature_overrides WHERE tenant_id=$1 AND feature_id=$2
    )
    RETURNING id
  `, [tenantId, FEATURE_ID]);
  console.log(`\n✅ tenant_feature_override for ${tenantId}:`, r.rows.length > 0 ? 'inserted' : 'already exists');
}

// 3. Check tenant_feature_overrides columns to understand the full table
const ovCols = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='tenant_feature_overrides'
  ORDER BY ordinal_position
`);
console.log('\n=== tenant_feature_overrides columns ===', ovCols.rows.map(r => r.column_name).join(', '));

await pool.end();
