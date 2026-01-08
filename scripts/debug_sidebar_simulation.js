
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

async function simulateSidebar() {
    try {
        console.log('🔍 Simulando geração de sidebar para ADMIN...');

        // 1. Get Admin User ID
        const uRes = await pool.query("SELECT id, username FROM users WHERE username = 'admin'");
        if (uRes.rows.length === 0) {
            console.log("❌ Usuário admin não encontrado.");
            return;
        }
        const userId = uRes.rows[0].id;
        console.log(`👤 Admin ID: ${userId}`);

        // 2. Call the function
        const funcRes = await pool.query("SELECT * FROM get_sidebar_menu_for_user($1)", [userId]);

        console.log(`📋 Total de itens retornados: ${funcRes.rows.length}`);

        // 3. Filter for Parametros
        const params = funcRes.rows.filter(r => r.name.includes('Param') || r.name.includes('aram') || r.resource === 'parametros');

        if (params.length === 0) {
            console.log("❌ NENHUM item 'Parametros' retornado pela função.");
        } else {
            console.log("✅ Itens 'Parametros' encontrados:");
            console.table(params.map(p => ({
                id: p.id,
                name: p.name,
                parent_id: p.parent_id,
                active: p.is_active,
                HAS_PERM: p.has_permission
            })));
        }

        // 4. Debug Sidebar Table Directly
        console.log('\n--- Tabela Raw (Sidebar Menu Items) ---');
        const rawRes = await pool.query("SELECT id, name, is_active, resource FROM sidebar_menu_items WHERE resource = 'parametros'");
        console.table(rawRes.rows);

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

simulateSidebar();
