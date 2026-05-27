const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function fixUrls() {
  try {
    console.log('🚀 Atualizando URLs das funcionalidades Master...');

    await pool.query("UPDATE public.system_features SET url = '/admin/master/modules' WHERE slug = 'master-modules';");
    await pool.query("UPDATE public.system_features SET url = '/admin/master/provisioning' WHERE slug = 'master-provisioning-hub';");
    await pool.query("UPDATE public.system_features SET url = '/admin/master/auditoria' WHERE slug = 'master-global-audit';");
    await pool.query("UPDATE public.system_features SET url = '/admin/master/segments' WHERE slug = 'master-segments';");
    await pool.query("UPDATE public.system_features SET url = '/admin/master/usuarios' WHERE slug = 'master-user-audit';");
    await pool.query("UPDATE public.system_features SET url = '/admin/master/fields' WHERE slug = 'master-field-builder';");

    console.log('✅ URLs atualizadas com sucesso! Os botões agora voltarão a ser links clicáveis.');

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
fixUrls();
