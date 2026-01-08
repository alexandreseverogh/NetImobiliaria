
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

async function checkMenu() {
    try {
        console.log('🔍 Buscando menu Parametros no Docker (15432)...');

        // Check item
        const r = await pool.query(`
      SELECT id, name, resource, permission_required, url 
      FROM sidebar_menu_items 
      WHERE name ILIKE '%Parametros%' OR resource = 'parametros'
    `);

        if (r.rows.length === 0) {
            console.log("❌ Item 'Parametros' NÃO encontrado na tabela sidebar_menu_items.");
        } else {
            console.log("✅ Item encontrado:", r.rows[0]);
            // Se encontrado, verificar permissão
            if (r.rows[0].permission_required) {
                console.log(`   Requer permissão: ${r.rows[0].permission_required}`);
                // Check if permission exists
                const p = await pool.query(`SELECT * FROM permissions WHERE name = $1`, [r.rows[0].permission_required]);
                if (p.rows.length === 0) console.log("   ❌ Permissão NÃO existe na tabela permissions.");
                else console.log("   ✅ Permissão existe na tabela permissions.");
            }
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

checkMenu();
