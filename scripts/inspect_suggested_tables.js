
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

async function inspectSuggested() {
    try {
        const tables = [
            'system_feature_categoria',
            'sidebar_menu_versions',
            'system_features_categories', // variation
            'sidebar_item_roles' // checking content again
        ];

        for (const t of tables) {
            const res = await pool.query("SELECT to_regclass($1)", [`public.${t}`]);
            const exists = !!res.rows[0].to_regclass;
            console.log(`Table '${t}': ${exists ? 'EXISTS ✅' : 'NOT FOUND ❌'}`);

            if (exists) {
                const cols = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '${t}'
            `);
                console.log(`   Columns: ${cols.rows.map(c => c.column_name).join(', ')}`);

                const count = await pool.query(`SELECT count(*) FROM ${t}`);
                console.log(`   Rows: ${count.rows[0].count}`);
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

inspectSuggested();
