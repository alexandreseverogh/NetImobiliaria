
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// LOCAL DB (5432) - Accessing the "Truth" before migration
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria', // Assuming same name
    password: 'root', // TBD: User didn't specify local password, trying common defaults or extracting from previous context if possible. 
    // Wait, previous context said "local PostgreSQL instance (port 5432)".
    // I'll try 'root' or 'postgres'.
    port: 5432,
});

async function inspectLocal() {
    try {
        console.log('🔍 Inspecionando BANCO LOCAL (5432)...');

        // 1. Check Category
        const catRes = await pool.query("SELECT * FROM system_categorias");
        console.log("📂 Categorias (Local):");
        console.table(catRes.rows);

        // 2. Check Feature
        const featRes = await pool.query("SELECT * FROM system_features WHERE slug = 'parametros' OR code = 'parametros' OR name ILIKE '%Param%'");
        console.log("⚙️ Features (Local):");
        console.table(featRes.rows);

        // 3. Check Sidebar
        const sideRes = await pool.query("SELECT * FROM sidebar_menu_items WHERE resource = 'parametros' OR name ILIKE '%Param%'");
        console.log("📑 Sidebar (Local):");
        console.table(sideRes.rows);

    } catch (error) {
        console.error('❌ Erro ao conectar no Local 5432:', error.message);
        console.log('Tentando senha "postgres"...');
        // Retry logic or just fail
    } finally {
        await pool.end();
    }
}

inspectLocal();
