
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function debugFunction() {
    try {
        console.log('--- Debugging get_sidebar_menu_for_user ---');
        // 1. Get Admin User ID
        const uRes = await pool.query("SELECT id, username FROM users WHERE username = 'admin' OR email LIKE 'admin%' LIMIT 1");
        if (uRes.rows.length === 0) throw new Error('Admin user not found');
        const userId = uRes.rows[0].id;
        console.log(`User: ${uRes.rows[0].username} (ID: ${userId})`);

        // 2. Call Function directly
        console.log(`\nCalling get_sidebar_menu_for_user(${userId})...`);
        const funcRes = await pool.query("SELECT * FROM get_sidebar_menu_for_user($1)", [userId]);

        const params = funcRes.rows.filter(r => r.name.includes('Param') || r.resource === 'parametros');
        if (params.length === 0) {
            console.log("❌ Function returned ZERO Parametros items.");
        } else {
            console.log("✅ Function returned:");
            console.table(params);
        }

        // 3. Inspect raw table again to compare
        console.log("\n--- Raw Table 'sidebar_menu_items' for Parametros ---");
        const rawRes = await pool.query("SELECT id, name, feature_id, is_active, parent_id, resource FROM sidebar_menu_items WHERE name ILIKE '%Param%' OR resource='parametros'");
        console.table(rawRes.rows);

        // 4. Check Feature Status
        if (rawRes.rows.length > 0) {
            const fid = rawRes.rows[0].feature_id;
            console.log(`\nChecking Feature ID ${fid}...`);
            const fRes = await pool.query("SELECT id, name, is_active FROM system_features WHERE id = $1", [fid]);
            console.table(fRes.rows);

            // 5. Check Permissions presence
            console.log(`\nChecking Permissions for Feature ${fid}...`);
            const pRes = await pool.query("SELECT * FROM permissions WHERE feature_id = $1", [fid]);
            console.table(pRes.rows);

            // 6. Check if User has Role that has Permission
            if (pRes.rows.length > 0) {
                const pid = pRes.rows[0].id;
                console.log(`\nChecking if User ${userId} has Permission ${pid}...`);
                const roleRes = await pool.query(`
                    SELECT r.name as role_name, rp.permission_id 
                    FROM user_role_assignments ura
                    JOIN user_roles r ON r.id = ura.role_id
                    JOIN role_permissions rp ON rp.role_id = r.id
                    WHERE ura.user_id = $1 AND rp.permission_id = $2
                `, [userId, pid]);

                if (roleRes.rows.length === 0) console.log("❌ User DOES NOT have the permission via any role.");
                else console.table(roleRes.rows);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

debugFunction();
