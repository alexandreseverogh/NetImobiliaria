const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: '127.0.0.1',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'net_imobiliaria'
});

async function run() {
    let log = '';
    try {
        log += '--- SCHEMAS ---\n';
        const schemas = await pool.query('SELECT nspname FROM pg_namespace');
        log += JSON.stringify(schemas.rows, null, 2) + '\n';

        log += '--- FUNÇÕES ---\n';
        const funcs = await pool.query(`
            SELECT n.nspname, p.proname, pg_get_function_arguments(p.oid) 
            FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
            WHERE p.proname LIKE '%get_sidebar%';
        `);
        log += JSON.stringify(funcs.rows, null, 2) + '\n';

        log += '--- TESTING CALL ---\n';
        try {
            const res = await pool.query('SELECT * FROM get_sidebar_menu_for_user($1::uuid, $2::text) LIMIT 1', ['00000000-0000-0000-0000-000000000000', 'admin']);
            log += 'CALL SUCCESSFUL\n';
        } catch (e) {
            log += 'CALL FAILED: ' + e.message + '\n';
        }

    } catch (e) {
        log += 'GENERAL ERROR: ' + e.message + '\n';
    } finally {
        fs.writeFileSync('debug_db.txt', log);
        await pool.end();
        process.exit(0);
    }
}

run();
