const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function debugTenantAdmin() {
  try {
    const tenantId = '883658a7-3115-4a95-92e1-5b3727156d91';
    console.log(`🔍 Investigando Admin da Imobiliária XYZ (ID: ${tenantId})...`);
    
    // 1. Verificar memberships
    const memberships = await pool.query(`
      SELECT utm.*, u.nome as user_name, u.email as user_email, ur.name as role_name
      FROM user_tenant_membership utm
      JOIN users u ON utm.user_id = u.id
      JOIN user_roles ur ON utm.role_id = ur.id
      WHERE utm.tenant_id = $1
    `, [tenantId]);

    console.log('\n👥 Membros Vinculados (user_tenant_membership):');
    memberships.rows.forEach(m => {
      console.log(`- ${m.user_name} (${m.user_email}) | Role: ${m.role_name} | Owner: ${m.is_owner}`);
    });

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
  }
}

debugTenantAdmin();
