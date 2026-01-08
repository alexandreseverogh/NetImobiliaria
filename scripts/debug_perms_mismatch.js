
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

async function checkPermsDebug() {
    try {
        console.log('🔍 Investigando permissões de Parametros...');

        // 1. Get Feature ID
        const fRes = await pool.query("SELECT id, slug FROM system_features WHERE slug = 'parametros'");
        if (fRes.rows.length === 0) {
            console.log("❌ Feature 'parametros' não encontrada (por slug).");
            return;
        }
        const featureId = fRes.rows[0].id;
        console.log(`✅ Feature 'parametros' ID: ${featureId}`);

        // 2. List all permissions for this feature
        const pRes = await pool.query("SELECT id, action, description FROM permissions WHERE feature_id = $1", [featureId]);
        console.log("📋 Permissões disponíveis para esta feature:");
        console.table(pRes.rows);

        // 3. User Role Assignments (Admin)
        // Assuming user 'admin' or role 'Admin'
        const roleRes = await pool.query("SELECT id FROM user_roles WHERE name IN ('Admin', 'Administrador')");
        const roleId = roleRes.rows[0]?.id;
        console.log(`👤 Role Admin ID: ${roleId}`);

        // 4. Check what the role has
        const rpRes = await pool.query(`
        SELECT p.action
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = $1 AND p.feature_id = $2
    `, [roleId, featureId]);

        console.log("✅ Permissões que o Admin possui:");
        console.table(rpRes.rows);

        // 5. Check Sidebar Item Requirement
        const sbRes = await pool.query(`
        SELECT name, permission_required, permission_action 
        FROM sidebar_menu_items 
        WHERE resource = 'parametros'
    `);
        console.log("📑 Requisito do Sidebar Item:");
        console.table(sbRes.rows);


    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

checkPermsDebug();
