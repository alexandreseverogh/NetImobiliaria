import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria',
  password: 'postgres', port: 15432,
});

// 1. Find admmd user
const user = await pool.query(`
  SELECT id, username, email FROM public.users WHERE username = 'admmd' OR email ILIKE '%admmd%'
  LIMIT 3
`);
console.log('=== admmd user ===', JSON.stringify(user.rows));

if (user.rows.length === 0) {
  // Try finding any master/admin user
  const masterUser = await pool.query(`
    SELECT u.id, u.username
    FROM public.users u
    JOIN public.user_role_assignments ura ON ura.user_id = u.id
    JOIN public.user_roles ur ON ur.id = ura.role_id
    WHERE ur.is_system_role = true
    LIMIT 3
  `);
  console.log('=== Master users ===', JSON.stringify(masterUser.rows));
}

// 2. Test function with the first user found
const userId = user.rows[0]?.id;
if (userId) {
  const result = await pool.query(
    `SELECT get_sidebar_menu_for_user($1::uuid, 'admin', NULL) AS menu`,
    [userId]
  );
  const menu = result.rows[0]?.menu ?? [];
  console.log('\n=== Menu categories ===');
  for (const cat of menu) {
    console.log(`  📁 ${cat.name} (${cat.children?.length ?? 0} items)`);
    for (const child of (cat.children ?? [])) {
      const highlight = child.path?.includes('auditoria') ? ' ← 🎯 AUDITORIA' : '';
      console.log(`      • ${child.name} → ${child.path}${highlight}`);
    }
  }

  // Check if auditoria appears
  const hasAuditoria = menu.some((cat) =>
    cat.children?.some((c) => c.path?.includes('auditoria'))
  );
  console.log('\n' + (hasAuditoria ? '✅ Auditoria visible in sidebar!' : '❌ Auditoria NOT in menu'));
}

await pool.end();
