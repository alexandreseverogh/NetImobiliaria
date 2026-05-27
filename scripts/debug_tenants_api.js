import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'net_imobiliaria'
});

async function run() {
  try {
    const query = `
      SELECT t.*,
             s.name as segment_name, s.color_theme as segment_color, s.icon as segment_icon,
             u.nome as admin_nome, u.email as admin_email, u.username as admin_username,
             (
               SELECT json_agg(sm.name)
               FROM tenant_modules tm
               JOIN system_modules sm ON tm.module_id = sm.id
               WHERE tm.tenant_id = t.id AND tm.is_enabled = true
             ) as active_modules
      FROM tenants t
      LEFT JOIN system_segments s ON t.segment_id = s.id
      LEFT JOIN user_tenant_membership utm ON t.id = utm.tenant_id AND utm.is_owner = true
      LEFT JOIN users u ON utm.user_id = u.id
      ORDER BY t.created_at DESC
    `;
    
    const result = await pool.query(query);
    console.log(`Found ${result.rows.length} rows.`);
    result.rows.forEach(r => console.log(`- ${r.name} (Slug: ${r.slug}, Admin: ${r.admin_nome})`));
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
