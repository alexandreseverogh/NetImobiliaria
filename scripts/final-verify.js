const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function finalVerification() {
  try {
    console.log('1. Verificando vínculo Motor <-> Segmento...');
    const res = await pool.query(`
      SELECT s.name as segment, m.name as module
      FROM system_segment_modules smm
      JOIN system_segments s ON smm.segment_id = s.id
      JOIN system_modules m ON smm.module_id = m.id
      WHERE s.name = 'Imobiliário' AND m.name = 'Mercado Imobiliário'
    `);
    
    if (res.rows.length > 0) {
      console.log('✅ Vínculo confirmado: Mercado Imobiliário pertence ao segmento Imobiliário.');
    } else {
      console.log('❌ FALHA: O vínculo ainda não existe.');
    }

    console.log('\n2. Verificando Sidebar para admxyz com a nova função unificada...');
    const userRes = await pool.query("SELECT id FROM users WHERE username = 'admxyz'");
    const tenantRes = await pool.query("SELECT id FROM tenants WHERE name ILIKE '%Imobiliaria XYZ%'");
    
    if (userRes.rows.length > 0 && tenantRes.rows.length > 0) {
      const sidebar = await pool.query("SELECT public.get_sidebar_menu_for_user($1, 'admin', $2) as menu", [userRes.rows[0].id, tenantRes.rows[0].id]);
      const count = sidebar.rows[0].menu.length;
      console.log(`✅ Resultado Sidebar: ${count} itens encontrados.`);
      if (count > 5) {
        console.log('✅ SUCESSO: A sidebar da Imobiliaria XYZ agora está populada!');
      } else {
        console.log('⚠️ AVISO: A sidebar ainda parece estar com poucos itens.');
      }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

finalVerification();
