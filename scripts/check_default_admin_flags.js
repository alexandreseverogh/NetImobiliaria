const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query(`
            SELECT f.slug, f.is_default_tenant_admin_feature, m.slug as module_slug
            FROM system_features f
            JOIN system_feature_modules fm ON f.id = fm.feature_id
            JOIN system_modules m ON fm.module_id = m.id
            WHERE m.slug IN ('crm', 'admin')
            ORDER BY m.slug, f.slug
        `);
        console.table(res.rows);
    } catch(e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
