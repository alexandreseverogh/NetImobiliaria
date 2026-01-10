const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: 'net_imobiliaria',
    password: process.env.POSTGRES_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
});

async function checkConfig() {
    try {
        await client.connect();
        console.log('Connected to database');

        console.log('\n--- Checking route_permissions_config (proprietarios/mine) ---');
        const routes = await client.query(`
            SELECT r.route_pattern, r.method, sf.slug as feature_slug, r.default_action as action, r.requires_auth 
            FROM route_permissions_config r
            LEFT JOIN system_features sf ON r.feature_id = sf.id
            WHERE r.route_pattern = '/api/admin/proprietarios/mine' 
            ORDER BY r.route_pattern, r.method
        `);
        console.log(JSON.stringify(routes.rows, null, 2));

        /*
        console.log('\n--- Finding a Corretor User ---');
        const user = await client.query(`
            SELECT u.id, u.email, r.name as role_name 
            FROM users u
            JOIN user_role_assignments ura ON u.id = ura.user_id
            JOIN user_roles r ON ura.role_id = r.id
            WHERE r.name = 'Corretor'
            LIMIT 1
        `);

        if (user.rows.length === 0) {
            console.log('No Corretor user found!');
        } else {
            const userId = user.rows[0].id;
            console.log('Testing permission for user:', user.rows[0].email, '(', userId, ')');

            // Query identical to PermissionChecker.ts
            // allowedActions for READ are ['read', 'list']
            const allowedActions = ['read', 'list'];
            const featureSlug = 'status-imoveis';

            console.log('Checking feature:', featureSlug, 'Actions:', allowedActions);

            const check = await client.query(`
              SELECT 1
              FROM user_role_assignments ura
              JOIN role_permissions rp ON ura.role_id = rp.role_id
              JOIN permissions p ON rp.permission_id = p.id
              JOIN system_features sf ON p.feature_id = sf.id
              WHERE ura.user_id = $1
                AND sf.slug = $2
                AND sf.is_active = true
                AND p.action = ANY($3::text[])
              LIMIT 1
            `, [userId, featureSlug, allowedActions]);

            console.log('Has Permission?', check.rows.length > 0);
        }

        /*
        console.log('\n--- Checking Permissions for Corretor Role ---');
        const permissions = await client.query(`
            SELECT r.name as role_name, sf.slug as feature, p.action 
            FROM user_roles r
            JOIN role_permissions rp ON r.id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            JOIN system_features sf ON p.feature_id = sf.id
            WHERE r.name = 'Corretor'
              AND (sf.slug LIKE '%status%' OR sf.slug LIKE '%imove%' OR sf.slug LIKE '%final%' OR sf.slug LIKE '%tipo%')
             ORDER BY sf.slug, p.action
        `);
        console.log(JSON.stringify(permissions.rows, null, 2));
        */

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkConfig();
