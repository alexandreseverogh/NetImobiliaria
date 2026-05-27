const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function provisionPermissions() {
  const pool = new Pool({
    user: process.env.DB_USER, host: '127.0.0.1',
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
  });

  const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';
  const roleId = 42; // Role 'Administrador' do admxyz

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Buscar todos os módulos ativos do tenant
    const modules = await client.query(`
      SELECT sm.id, sm.name, sm.slug
      FROM tenant_modules tm
      JOIN system_modules sm ON tm.module_id = sm.id
      WHERE tm.tenant_id = $1 AND tm.is_enabled = true
    `, [tenantId]);

    console.log(`✅ Módulos ativos para provisionar: ${modules.rows.map(m => m.name).join(', ')}`);

    // 2. Para cada módulo, buscar features e suas permissões
    let totalInserted = 0;
    for (const mod of modules.rows) {
      const permissions = await client.query(`
        SELECT p.id as permission_id, p.action, sf.name as feature_name
        FROM system_feature_modules sfm
        JOIN system_features sf ON sfm.feature_id = sf.id
        JOIN permissions p ON p.feature_id = sf.id
        WHERE sfm.module_id = $1 AND sf.is_active = true
      `, [mod.id]);

      console.log(`\n📦 ${mod.name}: ${permissions.rows.length} permissões`);

      for (const perm of permissions.rows) {
        // INSERT ignorando duplicatas
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
          VALUES ($1, $2, NULL, NOW())
          ON CONFLICT DO NOTHING
        `, [roleId, perm.permission_id]);
        totalInserted++;
      }
    }

    // 3. Também garantir features is_default_tenant_admin_feature
    const defaults = await client.query(`
      SELECT p.id as permission_id, p.action, sf.name as feature_name
      FROM system_features sf
      JOIN permissions p ON p.feature_id = sf.id
      WHERE sf.is_default_tenant_admin_feature = true AND sf.is_active = true
    `);

    console.log(`\n🔧 Features padrão de admin: ${defaults.rows.length} permissões`);
    for (const perm of defaults.rows) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
        VALUES ($1, $2, NULL, NOW())
        ON CONFLICT DO NOTHING
      `, [roleId, perm.permission_id]);
      totalInserted++;
    }

    await client.query('COMMIT');
    console.log(`\n✅ CONCLUÍDO! ${totalInserted} permissões provisionadas para o role Administrador (id=${roleId})`);

    // Verificar agora
    const verify = await pool.query(`
      SELECT COUNT(*) as total FROM role_permissions WHERE role_id = $1
    `, [roleId]);
    console.log(`📊 Total final em role_permissions para role_id=${roleId}: ${verify.rows[0].total}`);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

provisionPermissions();
