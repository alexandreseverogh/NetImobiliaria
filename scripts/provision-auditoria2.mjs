import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria',
  password: 'postgres', port: 15432,
});

const FEATURE_ID = 101;

// 1. Get role_permissions for desperdicio (925=read, 926=execute)
const rp97 = await pool.query(`
  SELECT rp.role_id, ur.name as role_name, p.action, p.id as perm_id
  FROM public.role_permissions rp
  JOIN public.permissions p ON p.id = rp.permission_id
  JOIN public.user_roles ur ON ur.id = rp.role_id
  WHERE p.feature_id = 97
  ORDER BY rp.role_id, p.action
`);
console.log('=== role_permissions for desperdicio ===');
console.log(JSON.stringify(rp97.rows, null, 2));

// 2. Insert permissions for Auditoria (mirror desperdicio)
const readPerm = await pool.query(`
  INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
  SELECT $1, 'read', 'Visualizar relatório de auditoria de campanhas', false, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE feature_id=$1 AND action='read')
  RETURNING id
`, [FEATURE_ID]);
console.log('\n✅ read permission:', readPerm.rows[0]?.id ?? 'already exists');

const execPerm = await pool.query(`
  INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
  SELECT $1, 'execute', 'Gerar relatório de auditoria com narrativa LLM', false, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM public.permissions WHERE feature_id=$1 AND action='execute')
  RETURNING id
`, [FEATURE_ID]);
console.log('✅ execute permission:', execPerm.rows[0]?.id ?? 'already exists');

// 3. Fetch the inserted permission IDs
const auditPerms = await pool.query(`
  SELECT id, action FROM public.permissions WHERE feature_id = $1
`, [FEATURE_ID]);
console.log('\n=== Auditoria permissions ===', JSON.stringify(auditPerms.rows));

// 4. Get distinct roles from desperdicio's role_permissions to mirror
const rolesFromDesp = await pool.query(`
  SELECT DISTINCT rp.role_id, ur.name as role_name
  FROM public.role_permissions rp
  JOIN public.permissions p ON p.id = rp.permission_id
  JOIN public.user_roles ur ON ur.id = rp.role_id
  WHERE p.feature_id = 97
`);
console.log('\n=== Roles with desperdicio access ===', JSON.stringify(rolesFromDesp.rows));

// 5. Add role_permissions for each role + each auditoria permission
let count = 0;
for (const role of rolesFromDesp.rows) {
  for (const perm of auditPerms.rows) {
    const r = await pool.query(`
      INSERT INTO public.role_permissions (role_id, permission_id)
      SELECT $1, $2
      WHERE NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id=$1 AND permission_id=$2)
      RETURNING role_id, permission_id
    `, [role.role_id, perm.id]);
    if (r.rows.length > 0) count++;
  }
}
console.log(`\n✅ role_permissions inserted: ${count}`);

// 6. Check system_feature_categorias — does desperdicio have explicit mappings?
const sfc97 = await pool.query(`
  SELECT * FROM public.system_feature_categorias WHERE feature_id = 97
`);
console.log('\n=== system_feature_categorias for desperdicio ===', JSON.stringify(sfc97.rows));

await pool.end();
