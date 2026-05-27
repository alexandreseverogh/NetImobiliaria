const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query(`
            SELECT s.name, s.permission_required, f.is_default_tenant_admin_feature,
                   (SELECT count(*) FROM sidebar_menu_item_modules smim WHERE smim.menu_item_id = s.id) as modules_count
            FROM sidebar_menu_items s
            LEFT JOIN system_features f ON s.permission_required = f.slug
            WHERE s.name ILIKE '%master%' OR s.permission_required ILIKE '%master%'
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
