const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres' });

async function debug() {
  try {
    const user = (await pool.query("SELECT * FROM users WHERE username = 'admmd'")).rows[0];
    const roleCheck = await pool.query(`
        SELECT ur.name, utm.tenant_id
        FROM public.user_tenant_membership utm
        JOIN public.user_roles ur ON utm.role_id = ur.id
        WHERE utm.user_id = $1 
    `, [user.id]);
    console.log("Roles for admmd:", roleCheck.rows);
    
    // Test the logic
    const adminCheck = await pool.query(`
        SELECT EXISTS (
              SELECT 1 FROM public.user_tenant_membership utm
              JOIN public.user_roles ur ON utm.role_id = ur.id
              WHERE utm.user_id = $1 
                AND utm.tenant_id = $2 
                AND (ur.name ILIKE '%admin%')
          ) as is_admin
    `, [user.id, user.tenant_id]);
    console.log("is_admin:", adminCheck.rows[0].is_admin);

    // Also check what category_id the feature 92 belongs to and if its module is provisioned!
    // AND sc.module_id IS NULL OR EXISTS (tenant_modules tm ...)
    const feat = await pool.query(`SELECT sc.name as cat_name, sc.module_id FROM system_features sf JOIN system_categorias sc ON sf.category_id = sc.id WHERE sf.id = 92`);
    console.log("Feature 92 Category:", feat.rows);
    if (feat.rows[0]?.module_id) {
       const moduleProv = await pool.query(`SELECT * FROM tenant_modules WHERE module_id = $1 AND tenant_id = $2`, [feat.rows[0].module_id, user.tenant_id]);
       console.log("Module provisioned?", moduleProv.rows);
    }
  } catch (e) { console.error(e); } finally { pool.end(); }
}
debug();
