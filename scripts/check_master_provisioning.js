const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query(`
            SELECT s.name as item, m.name as module_name, m.slug as module_slug, tm.is_enabled as provisioned
            FROM sidebar_menu_items s
            JOIN sidebar_menu_item_modules smim ON s.id = smim.menu_item_id
            JOIN system_modules m ON smim.module_id = m.id
            LEFT JOIN tenant_modules tm ON m.id = tm.module_id AND tm.tenant_id = (SELECT id FROM tenants WHERE name ILIKE '%Imobili%XYZ%' LIMIT 1)
            WHERE s.name ILIKE '%master%'
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
