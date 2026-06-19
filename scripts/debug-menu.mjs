import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria',
  password: 'postgres', port: 15432,
});

const userId = '67c62443-b022-4517-b7d8-bb90b8af38fd'; // admmd

// 1. User's role assignments
const roles = await pool.query(`
  SELECT ura.role_id, ur.name, ur.is_system_role
  FROM public.user_role_assignments ura
  JOIN public.user_roles ur ON ur.id = ura.role_id
  WHERE ura.user_id = $1
`, [userId]);
console.log('=== user_role_assignments ===', JSON.stringify(roles.rows));

// 2. User's tenant membership
const membership = await pool.query(`
  SELECT utm.tenant_id, utm.role_id, ur.name, ur.is_system_role, t.name as tenant_name
  FROM public.user_tenant_membership utm
  JOIN public.user_roles ur ON ur.id = utm.role_id
  JOIN public.tenants t ON t.id = utm.tenant_id
  WHERE utm.user_id = $1
`, [userId]);
console.log('\n=== user_tenant_membership ===', JSON.stringify(membership.rows, null, 2));

// 3. Category 30 details
const cat30 = await pool.query(`
  SELECT id, name, icon, sort_order, module_id, is_active FROM public.system_categorias WHERE id = 30
`);
console.log('\n=== system_categorias[30] ===', JSON.stringify(cat30.rows[0]));

// 4. Test the function with a specific tenant_id (from membership)
if (membership.rows.length > 0) {
  const tenantId = membership.rows[0].tenant_id;
  console.log('\n=== Testing with tenant_id:', tenantId, '===');
  const r = await pool.query(
    `SELECT get_sidebar_menu_for_user($1::uuid, 'admin', $2::uuid) AS menu`,
    [userId, tenantId]
  );
  const menu = r.rows[0]?.menu ?? [];
  console.log('Menu count:', menu.length);
  for (const cat of menu) {
    for (const child of (cat.children ?? [])) {
      if (child.path?.includes('campanha') || child.path?.includes('auditoria')) {
        const highlight = child.path?.includes('auditoria') ? ' ← 🎯 AUDITORIA' : '';
        console.log(`  ${cat.name} > ${child.name} → ${child.path}${highlight}`);
      }
    }
  }
  const hasAuditoria = menu.some(c => c.children?.some(ch => ch.path?.includes('auditoria')));
  console.log('\n' + (hasAuditoria ? '✅ Auditoria visible!' : '❌ Auditoria NOT in menu'));
}

// 5. Also test with NULL tenant
console.log('\n=== Testing with tenant_id: NULL ===');
const r2 = await pool.query(
  `SELECT get_sidebar_menu_for_user($1::uuid, 'admin', NULL) AS menu`,
  [userId]
);
const menu2 = r2.rows[0]?.menu ?? [];
console.log('Menu count (NULL tenant):', menu2.length);

await pool.end();
