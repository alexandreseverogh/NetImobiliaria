const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function sanitizePermissions() {
  try {
    console.log('🚀 Iniciando saneamento de permissões Master...');

    // 1. Identificar a categoria Master Governance
    const catRes = await pool.query("SELECT id FROM system_categorias WHERE name ILIKE '%Master Governance%'");
    if (catRes.rows.length === 0) return;
    const catId = catRes.rows[0].id;

    // 2. Remover todas as permissões desta categoria de qualquer perfil que NÃO seja master
    const deleteRes = await pool.query(`
      DELETE FROM public.role_permissions 
      WHERE permission_id IN (
        SELECT p.id 
        FROM public.permissions p
        JOIN public.system_features sf ON p.feature_id = sf.id
        WHERE sf.category_id = $1
      )
      AND role_id IN (
        SELECT id FROM public.user_roles WHERE is_system_role = false
      )
    `, [catId]);

    console.log(`✅ Saneamento concluído: ${deleteRes.rowCount} permissões indevidas removidas.`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
sanitizePermissions();
