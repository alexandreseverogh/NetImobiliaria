const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function verifySkillDelivery() {
  const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a'; // XYZ
  console.log(`[AUDITORIA] Verificando entrega de Skills para Tenant XYZ (${tenantId})...`);

  try {
    const query = `
      SELECT 
        f.slug,
        m.name as skill_name,
        m.component_path,
        o.is_active,
        o.skill_config
      FROM public.system_features f
      JOIN public.system_skill_manifest m ON f.id = m.feature_id
      JOIN public.tenant_feature_overrides o ON f.id = o.feature_id
      WHERE o.tenant_id = $1 
        AND o.is_active = true 
        AND f.is_skill = true
    `;

    const result = await pool.query(query, [tenantId]);

    if (result.rows.length > 0) {
      console.log('✅ BACKEND VALIDADO! O sistema está entregando as seguintes Superpowers:');
      console.table(result.rows);
      
      const dashSkill = result.rows.find(r => r.slug === 'dashboards');
      if (dashSkill && dashSkill.skill_config.primary_color === '#F59E0B') {
        console.log('🎨 TESTE DE PARAMETRIZAÇÃO: OK! (Cor Laranja confirmada)');
      }
    } else {
      console.log('⚠️ ALERTA: Nenhuma skill ativa encontrada para o tenant.');
    }
  } catch (err) {
    console.error('❌ Erro na auditoria:', err.message);
  } finally {
    await pool.end();
  }
}

verifySkillDelivery();
