const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const client = new Client({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: 'net_imobiliaria',
    password: process.env.POSTGRES_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
});

async function main() {
    const userId = 'c57ab897-c068-46a4-9b12-bb9f2d938fe7'; // From the log provided by user
    const featureSlug = 'status-imoveis';
    const allowedActions = ['read', 'list'];

    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Check User and Role Assignment
        console.log('\n--- 1. User Role Assignment ---');
        const userRes = await client.query(`
            SELECT u.username, ur.name as role_name, ur.id as role_id
            FROM user_role_assignments ura
            JOIN users u ON ura.user_id = u.id
            JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ura.user_id = $1
        `, [userId]);
        console.table(userRes.rows);

        if (userRes.rows.length === 0) {
            console.error('User has no role assigned!');
            return;
        }
        const roleId = userRes.rows[0].role_id;

        // 2. Check Feature Status
        console.log('\n--- 2. Feature Check ---');
        const featureRes = await client.query(`
            SELECT id, name, slug, is_active 
            FROM system_features 
            WHERE slug = $1
        `, [featureSlug]);
        console.table(featureRes.rows);

        if (featureRes.rows.length === 0) {
            console.error('Feature not found!');
            return;
        }
        if (!featureRes.rows[0].is_active) {
            console.error('Feature is INACTIVE!');
        }
        const featureId = featureRes.rows[0].id;

        // 3. Check Permissions for this feature
        console.log('\n--- 3. Permissions for Feature ---');
        const permRes = await client.query(`
            SELECT id, action, description 
            FROM permissions 
            WHERE feature_id = $1 AND action = ANY($2)
        `, [featureId, allowedActions]);
        console.table(permRes.rows);

        if (permRes.rows.length === 0) {
            console.error('No matching permissions found for this feature and actions');
        }

        // 4. Check Role Permission Link
        console.log('\n--- 4. Role Permissions Link ---');
        const linkRes = await client.query(`
            SELECT rp.id, rp.role_id, rp.permission_id
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role_id = $1 AND p.feature_id = $2 AND p.action = ANY($3)
        `, [roleId, featureId, allowedActions]);
        console.table(linkRes.rows);

        if (linkRes.rows.length > 0) {
            console.log('\n✅ CHAIN IS COMPLETE. Access should be granted.');
        } else {
            console.error('\n❌ CHAIN BROKEN at Role-Permission link.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();
