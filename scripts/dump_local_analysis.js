
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const localConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'Roberto@2007',
    port: 5432,
};

async function inspectDB() {
    const pool = new Pool(localConfig);
    const log = [];

    try {
        log.push('--- INSPEÇÃO BANCO LOCAL (5432) ---');

        const tables = [
            'system_categorias',
            'system_features',
            'system_feature_categoria', // CHECK THIS
            'sidebar_menu_items',
            'sidebar_item_roles',
            'sidebar_menu_versions', // CHECK THIS
            'permissions',
            'role_permissions'
        ];

        for (const t of tables) {
            log.push(`\n>>> TABLE: ${t}`);
            // Check existence
            const res = await pool.query(`SELECT to_regclass('public.${t}')`);
            if (!res.rows[0].to_regclass) {
                log.push('   ❌ NÃO EXISTE.');
                continue;
            }

            // Get Columns
            const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}'`);
            log.push(`   Cols: ${cols.rows.map(c => c.column_name + '(' + c.data_type + ')').join(', ')}`);

            // Get Data (Filtered or Limit)
            let query = `SELECT * FROM ${t} LIMIT 10`;
            if (t === 'system_features') query = `SELECT * FROM ${t} WHERE name ILIKE '%Param%' OR slug = 'parametros'`;
            if (t === 'sidebar_menu_items') query = `SELECT * FROM ${t} WHERE resource = 'parametros' OR name ILIKE '%Param%'`;
            if (t === 'permissions') query = `SELECT * FROM ${t} WHERE feature_id IN (SELECT id FROM system_features WHERE slug='parametros')`; // Assume slug exists

            try {
                const rows = await pool.query(query);
                if (rows.rows.length > 0) {
                    log.push('   ROWS:');
                    log.push(JSON.stringify(rows.rows, null, 2));
                } else {
                    log.push('   (0 rows matched)');
                }
            } catch (err) {
                log.push(`   Query Error: ${err.message}`);
                // Fallback for permissions if slug doesn't exist
                if (t === 'permissions') {
                    log.push('   Retrying permissions with broader scope...');
                    const p2 = await pool.query(`SELECT * FROM ${t} LIMIT 5`);
                    log.push(JSON.stringify(p2.rows, null, 2));
                }
            }
        }

    } catch (err) {
        log.push(`FATAL ERROR: ${err.message}`);
    } finally {
        await pool.end();
        fs.writeFileSync('analysis_local_db.txt', log.join('\n'));
        console.log('Analysis saved to analysis_local_db.txt');
    }
}

inspectDB();
