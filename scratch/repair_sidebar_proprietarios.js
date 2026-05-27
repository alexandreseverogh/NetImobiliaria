const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria',
  password: 'postgres',
  port: 15432,
});

async function repairSidebar() {
  try {
    console.log('🛠️ Iniciando Reparação da Sidebar...');
    
    // 1. Garantir URL correta para Proprietários e ativar a feature
    const updateFeat = await pool.query(`
      UPDATE system_features 
      SET url = '/admin/proprietarios',
          slug = 'proprietarios',
          is_active = true
      WHERE name ILIKE '%Proprietários%'
      RETURNING id, category_id
    `);

    if (updateFeat.rows.length > 0) {
      console.log(`✅ URL de Proprietários restaurada para ${updateFeat.rows.length} registro(s).`);
    } else {
      console.log('⚠️ Nenhuma funcionalidade "Proprietários" encontrada para atualizar.');
    }

    // 2. Verificar se existe categoria fantasma com nome 'Proprietários' que possa estar conflitando
    const ghostCat = await pool.query("SELECT id, name FROM system_categorias WHERE name ILIKE '%Proprietários%'");
    for (const cat of ghostCat.rows) {
      console.log(`⚠️ Detectada categoria conflituosa: "${cat.name}" (ID ${cat.id}). Removendo...`);
      await pool.query("DELETE FROM system_categorias WHERE id = $1", [cat.id]);
    }

    // 3. Vincular a uma categoria estável (Cadastros ou Parâmetros, mas com URL agora)
    const targetCat = await pool.query("SELECT id FROM system_categorias WHERE name ILIKE '%Cadastros%' OR name ILIKE '%Mercado%' LIMIT 1");
    if (targetCat.rows.length > 0) {
      await pool.query("UPDATE system_features SET category_id = $1 WHERE name ILIKE '%Proprietários%'", [targetCat.rows[0].id]);
      console.log(`✅ Proprietários movido para categoria estável (ID ${targetCat.rows[0].id}).`);
    }

    console.log('\n🚀 REPARAÇÃO CONCLUÍDA!');
    console.log('Por favor, dê um F5 no navegador.');

  } catch (err) {
    console.error('❌ Erro na reparação:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

repairSidebar();
