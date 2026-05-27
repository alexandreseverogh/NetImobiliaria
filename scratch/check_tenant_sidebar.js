const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432
});

async function checkTenantConfig() {
    try {
        const tenantName = 'Imobiliaria XYZ';
        console.log(`--- INVESTIGANDO TENANT: ${tenantName} ---`);
        
        const tenantRes = await pool.query("SELECT id FROM tenants WHERE name = $1", [tenantName]);
        if (tenantRes.rows.length === 0) {
            console.log("Tenant não encontrado.");
            return;
        }
        const tenantId = tenantRes.rows[0].id;
        console.log(`Tenant ID: ${tenantId}`);

        console.log('\n--- MÓDULOS HABILITADOS ---');
        const modulesRes = await pool.query(`
            SELECT sm.name, sm.slug, tm.is_enabled 
            FROM tenant_modules tm
            JOIN system_modules sm ON tm.module_id = sm.id
            WHERE tm.tenant_id = $1
        `, [tenantId]);
        modulesRes.rows.forEach(m => console.log(`${m.is_enabled ? '✅' : '❌'} ${m.name} (${m.slug})`));

        console.log('\n--- FEATURE "PARAMETROS" ---');
        const featRes = await pool.query(`
            SELECT f.id, f.name, f.slug, f.is_active, sm.name as module_name
            FROM system_features f
            LEFT JOIN system_feature_modules sfm ON f.id = sfm.feature_id
            LEFT JOIN system_modules sm ON sfm.module_id = sm.id
            WHERE f.slug = 'parametros'
        `);
        if (featRes.rows.length > 0) {
            const f = featRes.rows[0];
            console.log(`Feature: ${f.name} | Slug: ${f.slug} | Active: ${f.is_active} | Modulo: ${f.module_name}`);
        } else {
            console.log("Feature 'parametros' não encontrada.");
        }

        console.log('\n--- SIDEBAR ITEMS "PARAMETROS" ---');
        const sideRes = await pool.query(`
            SELECT s.id, s.name, s.feature_id, s.resource, s.is_active, s.parent_id
            FROM sidebar_menu_items s
            WHERE s.name ILIKE '%Parâmetros%' OR s.resource = 'parametros'
        `);
        sideRes.rows.forEach(s => console.log(`Item: ${s.name} | ID: ${s.id} | FeatureID: ${s.feature_id} | Resource: ${s.resource} | Active: ${s.is_active} | Parent: ${s.parent_id}`));

    } catch (error) {
        console.error('Erro:', error);
    } finally {
        await pool.end();
    }
}

checkTenantConfig();
