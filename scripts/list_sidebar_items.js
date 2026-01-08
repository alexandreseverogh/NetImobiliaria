
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Docker DB (15432)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function listAllSidebar() {
    try {
        const r = await pool.query(`
      SELECT id, name, resource, permission_required, permission_action, feature_id 
      FROM sidebar_menu_items 
      WHERE name ILIKE '%Par%' 
      OR resource ILIKE '%par%'
    `);
        console.table(r.rows.map(i => ({
            id: i.id,
            name: i.name,
            res: i.resource,
            req: i.permission_required,
            act: i.permission_action,
            feat: i.feature_id
        })));
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

listAllSidebar();
