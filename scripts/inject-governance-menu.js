const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function injectGovernanceMenu() {
  try {
    const masterGroup = await pool.query("SELECT id FROM sidebar_menu_items WHERE name = 'MASTER PLATFORM' LIMIT 1");
    if (masterGroup.rows.length === 0) {
      console.log('Grupo MASTER PLATFORM não encontrado');
      return;
    }
    const groupId = masterGroup.rows[0].id;

    // Verificar existência
    const exists = await pool.query("SELECT id FROM sidebar_menu_items WHERE url = '/admin/master/governance' LIMIT 1");
    
    if (exists.rows.length === 0) {
      await pool.query(
        "INSERT INTO sidebar_menu_items (name, url, icon_name, parent_id, order_index, is_active, system_id) VALUES ($1, $2, $3, $4, $5, true, 'admin')",
        ['Cockpit de Produto 💎', '/admin/master/governance', 'Squares2X2Icon', groupId, 2]
      );
      console.log('✅ Menu Cockpit de Produto injetado com sucesso!');
    } else {
      console.log('ℹ️ Menu Cockpit de Produto já existe.');
    }
    
  } catch (err) {
    console.error('Erro ao injetar menu:', err);
  } finally {
    await pool.end();
  }
}

injectGovernanceMenu();
