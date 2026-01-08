
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

async function findOrphans() {
    try {
        console.log('🔍 Buscando itens órfãos na sidebar...');

        const r = await pool.query(`
      SELECT * 
      FROM sidebar_menu_items 
      WHERE parent_id IS NOT NULL 
        AND parent_id NOT IN (SELECT id FROM sidebar_menu_items)
    `);

        if (r.rows.length === 0) {
            console.log("✅ Nenhum item órfão encontrado.");
        } else {
            console.log(`⚠️  ${r.rows.length} itens órfãos encontrados:`);
            console.table(r.rows.map(i => ({ ID: i.id, Name: i.name, ParentID: i.parent_id, URL: i.url })));
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

findOrphans();
