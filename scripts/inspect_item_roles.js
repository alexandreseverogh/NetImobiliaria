
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

async function inspectItemRoles() {
    try {
        console.log('🔍 Inspecionando sidebar_item_roles...');

        // Check if table exists
        const t = await pool.query("SELECT to_regclass('public.sidebar_item_roles')");
        if (!t.rows[0].to_regclass) {
            console.log("❌ Tabela sidebar_item_roles NÃO existe.");
            return;
        }

        // Check content
        const r = await pool.query("SELECT * FROM sidebar_item_roles");
        console.log(`✅ Tabela existe. ${r.rows.length} registros.`);
        if (r.rows.length > 0) console.table(r.rows);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

inspectItemRoles();
