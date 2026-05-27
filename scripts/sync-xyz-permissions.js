const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function syncAdminPermissions() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('1. Localizando Tenant e Cargo Admin...');
    const tenantRes = await client.query("SELECT id FROM tenants WHERE name ILIKE '%Imobiliaria XYZ%'");
    if (tenantRes.rows.length === 0) throw new Error('Empresa não encontrada');
    const tenantId = tenantRes.rows[0].id;

    // Buscar o cargo de Admin dessa empresa (is_system_admin ou nivel mais alto)
    const roleRes = await client.query(`
      SELECT id FROM roles 
      WHERE tenant_id = $1 
      AND (is_system_admin = true OR name ILIKE '%Administrador%' OR name ILIKE '%Diretor%')
      ORDER BY role_level DESC LIMIT 1
    `, [tenantId]);

    if (roleRes.rows.length === 0) throw new Error('Cargo administrativo não encontrado para este tenant');
    const roleId = roleRes.rows[0].id;

    console.log(`Tenant: ${tenantId}, Role Admin: ${roleId}`);

    console.log('2. Sincronizando todas as features permitidas para este cargo...');
    // Inserir na role_permissions todas as features que estão ativas no tenant_feature_overrides
    // E também as features marcadas como is_default_tenant_admin_feature = true
    await client.query(`
      INSERT INTO role_permissions (role_id, feature_id, "action", can_create, can_read, can_update, can_delete)
      SELECT 
        $1 as role_id,
        f.id as feature_id,
        'ADMIN' as "action",
        true as can_create,
        true as can_read,
        true as can_update,
        true as can_delete
      FROM system_features f
      WHERE f.is_active = true
      AND (
        f.id IN (SELECT feature_id FROM tenant_feature_overrides WHERE tenant_id = $2 AND is_active = true)
        OR f.is_default_tenant_admin_feature = true
      )
      ON CONFLICT (role_id, feature_id, "action") DO UPDATE SET
        can_create = true,
        can_read = true,
        can_update = true,
        can_delete = true
    `, [roleId, tenantId]);

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Permissões de cargo sincronizadas para Imobiliaria XYZ!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ ERRO:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

syncAdminPermissions();
