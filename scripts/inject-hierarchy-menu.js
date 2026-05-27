const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function injectHierarchyMenu() {
  try {
    console.log('🚀 Iniciando injeção do menu "Pirâmide de Autoridade"...');

    // 1. Localizar o item "Perfis" para herdar o parent_id e sistema
    const perfisItem = await pool.query("SELECT parent_id, system_id FROM sidebar_menu_items WHERE url = '/admin/perfis' LIMIT 1");
    
    if (perfisItem.rows.length === 0) {
      console.log('⚠️ Item "/admin/perfis" não encontrado. Tentando localizar por nome...');
      const perfisByName = await pool.query("SELECT id, parent_id, system_id FROM sidebar_menu_items WHERE name ILIKE '%Perfis%' LIMIT 1");
      if (perfisByName.rows.length === 0) {
         console.error('❌ Não foi possível localizar o grupo de Perfis.');
         return;
      }
      perfisItem.rows = perfisByName.rows;
    }

    const { parent_id, system_id } = perfisItem.rows[0];
    console.log(`✅ Grupo pai localizado: ${parent_id} | Sistema: ${system_id}`);

    // 2. Verificar se já existe
    const exists = await pool.query("SELECT id FROM sidebar_menu_items WHERE url = '/admin/perfis-hierarquias' LIMIT 1");
    
    if (exists.rows.length === 0) {
      await pool.query(
        "INSERT INTO sidebar_menu_items (name, url, icon_name, parent_id, order_index, is_active, system_id, permission_required) VALUES ($1, $2, $3, $4, $5, true, $6, $7)",
        ['Pirâmide de Autoridade 👑', '/admin/perfis-hierarquias', 'UserGroupIcon', parent_id, 20, true, system_id || 'admin', 'usuarios']
      );
      console.log('✅ Menu "Pirâmide de Autoridade" injetado com sucesso!');
    } else {
      console.log('ℹ️ Menu "Pirâmide de Autoridade" já existe. Atualizando ícone e nome...');
      await pool.query(
        "UPDATE sidebar_menu_items SET name = $1, icon_name = $2, permission_required = $3 WHERE url = '/admin/perfis-hierarquias'",
        ['Pirâmide de Autoridade 👑', 'UserGroupIcon', 'usuarios']
      );
    }
    
  } catch (err) {
    console.error('❌ Erro ao injetar menu:', err);
  } finally {
    await pool.end();
  }
}

injectHierarchyMenu();
