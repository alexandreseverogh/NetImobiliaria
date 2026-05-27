
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '15432'),
});

async function investigate() {
  try {
    console.log('--- INVESTIGANDO USUÁRIO admxyz ---');
    const userRes = await pool.query(`
      SELECT u.id, u.username, utm.tenant_id, t.name as tenant_name, ur.name as role_name, ur.level 
      FROM users u 
      JOIN user_tenant_membership utm ON u.id = utm.user_id 
      JOIN tenants t ON utm.tenant_id = t.id 
      JOIN user_roles ur ON u.role_id = ur.id 
      WHERE u.username = 'admxyz';
    `);
    
    if (userRes.rows.length === 0) {
      console.log('Usuário admxyz não encontrado!');
      return;
    }
    
    const user = userRes.rows[0];
    console.log('Usuário:', user);
    
    console.log('\n--- INVESTIGANDO MÓDULOS DO TENANT ---');
    const modulesRes = await pool.query(`
      SELECT tm.*, m.name as module_name, m.slug
      FROM tenant_modules tm
      JOIN modules m ON tm.module_id = m.id
      WHERE tm.tenant_id = $1;
    `, [user.tenant_id]);
    
    console.log('Módulos Ativos:', modulesRes.rows);
    
    console.log('\n--- INVESTIGANDO PERMISSÕES DA ROLE NO TENANT ---');
    // Verificar se a role tem permissões para o CRM
    const permsRes = await pool.query(`
      SELECT count(*) as total_perms
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE rp.role_id = $1 AND rp.tenant_id = $2 AND sf.category = 'crm';
    `, [user.role_id, user.tenant_id]);
    
    console.log('Permissões CRM encontradas:', permsRes.rows[0].total_perms);

    if (permsRes.rows[0].total_perms == 0) {
        console.log('⚠️ AVISO: Nenhuma permissão de CRM mapeada para esta role neste tenant!');
    }

    console.log('\n--- INVESTIGANDO BLUEPRINT DO TENANT ---');
    const blueprintRes = await pool.query(`
      SELECT * FROM system_segment_blueprints
      WHERE id IN (SELECT blueprint_id FROM tenants WHERE id = $1);
    `, [user.tenant_id]);
    console.log('Blueprint:', blueprintRes.rows);

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
  }
}

investigate();
