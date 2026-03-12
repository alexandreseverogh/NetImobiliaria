const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function diagnose() {
    try {
        console.log('--- BUSCANDO TABELA analytics_pageviews ---');
        const tableCheck = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'analytics_pageviews'");
        console.log(tableCheck.rows);

        console.log('\n--- BUSCANDO FEATURE visita-plataforma ---');
        const featureCheck = await pool.query("SELECT * FROM system_features WHERE slug = 'visita-plataforma'");
        console.log(featureCheck.rows);

        if (featureCheck.rows.length > 0) {
            const featureId = featureCheck.rows[0].id;
            console.log('\n--- BUSCANDO PERMISSÕES DA FEATURE ---');
            const perms = await pool.query("SELECT * FROM permissions WHERE feature_id = $1", [featureId]);
            console.log(perms.rows);
            
            console.log('\n--- BUSCANDO SIDEBAR ITEM ---');
            const sidebar = await pool.query("SELECT * FROM sidebar_menu_items WHERE feature_id = $1", [featureId]);
            console.log(sidebar.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

diagnose();
