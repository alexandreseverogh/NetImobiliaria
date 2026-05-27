const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function fixSidebar() {
  try {
    console.log('🚀 Ajustando Banco de Dados...');

    // 1. Achar o ID da categoria Master Governance
    const catRes = await pool.query("SELECT id FROM system_categorias WHERE name = 'Master Governance' LIMIT 1");
    if (catRes.rows.length === 0) {
      console.log('Categoria não encontrada!');
      return;
    }
    const catId = catRes.rows[0].id;

    // 3. Inserir Cockpit do Produto (corrigindo colunas)
    const cockpitRes = await pool.query("SELECT id FROM system_features WHERE slug = 'master-cockpit'");
    if (cockpitRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO system_features 
        (name, description, category_id, url, is_active, slug, icon) 
        VALUES 
        ('Cockpit do Produto', 'Orquestração de Arquitetura e Engenharia', $1, '/admin/master/cockpit', true, 'master-cockpit', 'RocketLaunchIcon')
      `, [catId]);
      console.log('✅ Cockpit do Produto inserido com sucesso!');
    } else {
      await pool.query("UPDATE system_features SET url = '/admin/master/cockpit', category_id = $1, icon = 'RocketLaunchIcon' WHERE slug = 'master-cockpit'", [catId]);
      console.log('✅ Cockpit do Produto atualizado.');
    }

  } catch (err) {
    console.error('Erro:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
fixSidebar();
