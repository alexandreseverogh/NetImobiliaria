const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgres://postgres:postgres@127.0.0.1:15432/net_imobiliaria' });

async function checkTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%sidebar%'");
        console.table(res.rows);
        
        const modules = await pool.query("SELECT id, name, slug FROM public.system_modules");
        console.log('--- Módulos Disponíveis ---');
        console.table(modules.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
checkTables();
