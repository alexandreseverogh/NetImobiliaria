import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria',
  password: 'postgres', port: 15432,
});

// 1. Check sidebar_menu_versions
const colsV = await pool.query(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema='public' AND table_name='sidebar_menu_versions'
  ORDER BY ordinal_position
`);
console.log('sidebar_menu_versions columns:', colsV.rows.map(r => r.column_name).join(', '));

const versions = await pool.query(`SELECT * FROM public.sidebar_menu_versions ORDER BY created_at DESC LIMIT 3`);
console.log('Current versions:', JSON.stringify(versions.rows, null, 2));

// 2. Confirm the Auditoria feature is correctly set up
const feat = await pool.query(`
  SELECT sf.id, sf.name, sf.url, sf.sort_order, sf.icon, sf.is_active, sf.category_id,
         sc.name as category_name
  FROM public.system_features sf
  JOIN public.system_categorias sc ON sc.id = sf.category_id
  WHERE sf.url = '/admin/campanhas/auditoria'
`);
console.log('\n=== Auditoria feature ===', JSON.stringify(feat.rows[0], null, 2));

// 3. Confirm tenant_feature_overrides
const tfo = await pool.query(`
  SELECT tfo.tenant_id, t.name as tenant_name, tfo.is_active
  FROM public.tenant_feature_overrides tfo
  JOIN public.tenants t ON t.id = tfo.tenant_id
  WHERE tfo.feature_id = 101
`);
console.log('\n=== tenant_feature_overrides for Auditoria ===', JSON.stringify(tfo.rows));

// 4. Confirm permissions and role assignments
const perms = await pool.query(`
  SELECT p.action, rp.role_id, ur.name as role_name
  FROM public.permissions p
  JOIN public.role_permissions rp ON rp.permission_id = p.id
  JOIN public.user_roles ur ON ur.id = rp.role_id
  WHERE p.feature_id = 101
  ORDER BY rp.role_id, p.action
`);
console.log('\n=== role_permissions for Auditoria ===', JSON.stringify(perms.rows));

await pool.end();
