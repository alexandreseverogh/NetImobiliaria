
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function simulate() {
    try {
        const userId = 2; // Hardcoding Admin ID see previous steps had ID 2 (or 1?) Wait previous step said User ID: 2
        // Re-verify user id to be safe
        const u = await pool.query("SELECT id FROM users WHERE username='admin'");
        const uid = u.rows[0].id;

        console.log(`Running for User: ${uid}`);

        const r = await pool.query("SELECT * FROM get_sidebar_menu_for_user($1)", [uid]);

        console.log(`Total Rows: ${r.rows.length}`);
        const targets = r.rows.filter(x => x.resource === 'parametros' || x.name === 'Parâmetros');

        if (targets.length === 0) {
            console.log("❌ ZERO PARAMETROS RETURNED.");
        } else {
            targets.forEach(t => {
                console.log(`✅ FOUND: ${t.name} (ID: ${t.id}, Active: ${t.is_active}, Perm: ${t.has_permission})`);
            });
        }

        // Check table raw
        const raw = await pool.query("SELECT * FROM sidebar_menu_items WHERE resource='parametros'");
        console.log(`Raw Table Count: ${raw.rows.length}`);
        raw.rows.forEach(x => console.log(`Raw: ${x.name} (Active: ${x.is_active}, Feature: ${x.feature_id})`));

    } catch (e) { console.error(e); } finally { pool.end(); }
}

simulate();
