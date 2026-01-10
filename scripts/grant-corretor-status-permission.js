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
    try {
        await client.connect();
        console.log('Connected to database');

        // 1. Get Role ID for 'Corretor'
        const roleRes = await client.query("SELECT id FROM user_roles WHERE name = 'Corretor'");
        if (roleRes.rows.length === 0) {
            console.error('Role Corretor not found');
            return;
        }
        const roleId = roleRes.rows[0].id;

        // 2. Get Feature ID for 'status-imoveis'
        const featureRes = await client.query("SELECT id FROM system_features WHERE slug = 'status-imoveis'");
        if (featureRes.rows.length === 0) {
            console.error('Feature status-imoveis not found');
            // Try to find by name if slug fails (fallback)
            const featureResFallback = await client.query("SELECT id FROM system_features WHERE name = 'Status Imóvel' OR name = 'status-imovel'");
            if (featureResFallback.rows.length === 0) {
                console.error('Feature status-imoveis not found (fallback also failed)');
                return;
            }
            console.log('Feature found via fallback');
            var featureId = featureResFallback.rows[0].id;
        } else {
            var featureId = featureRes.rows[0].id;
        }

        // 3. Find or Create Permission in 'permissions' table
        // We need 'read' permission for this specific feature
        let permissionId;
        const permissionRes = await client.query(
            "SELECT id FROM permissions WHERE feature_id = $1 AND action = 'read'",
            [featureId]
        );

        if (permissionRes.rows.length > 0) {
            permissionId = permissionRes.rows[0].id;
            console.log(`Found existing permission ID: ${permissionId}`);
        } else {
            console.log('Creating new permissions entry...');
            const newPermRes = await client.query(
                "INSERT INTO permissions (feature_id, action, description) VALUES ($1, 'read', 'Read access for status-imoveis') RETURNING id",
                [featureId]
            );
            permissionId = newPermRes.rows[0].id;
            console.log(`Created new permission ID: ${permissionId}`);
        }

        // 4. Grant Permission in 'role_permissions' table
        const checkRes = await client.query(
            "SELECT 1 FROM role_permissions WHERE role_id = $1 AND permission_id = $2",
            [roleId, permissionId]
        );

        if (checkRes.rows.length > 0) {
            console.log('Permission already assigned to this role.');
        } else {
            // Need to handle UUID for granted_by if enforced, assuming nullable or use a system user if needed.
            // Based on schema, granted_by is UUID. Let's try INSERT without it (assuming nullable) or NULL.
            await client.query(
                "INSERT INTO role_permissions (role_id, permission_id, granted_at) VALUES ($1, $2, NOW())",
                [roleId, permissionId]
            );
            console.log('Permission successfully granted to Corretor.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();
