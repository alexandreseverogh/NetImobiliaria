
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function tryConnect(password) {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'net_imobiliaria',
        password: password,
        port: 5432,
    });

    try {
        console.log(`🔌 Tentando conectar Local (5432) com senha: '${password}'...`);
        // 1. Check Category
        const catRes = await pool.query("SELECT * FROM system_categorias");
        console.log("✅ SUCESSO! 📂 Categorias (Local):");
        console.table(catRes.rows);

        // 2. Check Feature (Get ID and Category_ID)
        const featRes = await pool.query("SELECT id, name, slug, 'code' as code_col, category_id FROM system_features WHERE slug = 'parametros' OR name ILIKE '%Param%'");
        console.log("⚙️ Features (Local):");
        console.table(featRes.rows);

        // 3. Check Sidebar (Get ID, Parent_ID, Feature_ID, Resource)
        const sideRes = await pool.query("SELECT id, name, resource, feature_id, parent_id FROM sidebar_menu_items WHERE resource = 'parametros' OR name ILIKE '%Param%'");
        console.log("📑 Sidebar (Local):");
        console.table(sideRes.rows);

        return true;

    } catch (error) {
        console.log(`❌ Falha com senha '${password}': ${error.message}`);
        return false;
    } finally {
        await pool.end();
    }
}

async function run() {
    let success = await tryConnect('admin');
    if (!success) success = await tryConnect('123456');
    if (!success) success = await tryConnect('postgres');
    if (!success) success = await tryConnect('root');
}

run();
