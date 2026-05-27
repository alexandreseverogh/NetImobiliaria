const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function fixImobiliaria() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('1. Localizando IDs...');
    const segRes = await client.query("SELECT id FROM system_segments WHERE name = 'Imobiliário'");
    const modRes = await client.query("SELECT id FROM system_modules WHERE name = 'Mercado Imobiliário'");

    if (segRes.rows.length === 0 || modRes.rows.length === 0) {
      throw new Error('Segmento ou Módulo não encontrado');
    }

    const segmentId = segRes.rows[0].id;
    const moduleId = modRes.rows[0].id;

    console.log(`Segmento ID: ${segmentId}, Módulo ID: ${moduleId}`);

    console.log('2. Vinculando Módulo ao Segmento na Tabela Mestra...');
    await client.query(`
      INSERT INTO system_segment_modules (segment_id, module_id, is_active)
      VALUES ($1, $2, true)
      ON CONFLICT (segment_id, module_id) DO UPDATE SET is_active = true
    `, [segmentId, moduleId]);

    console.log('3. Provisionando funcionalidades para a Imobiliaria XYZ...');
    // Buscar o ID da Imobiliaria XYZ
    const tenantRes = await client.query("SELECT id FROM tenants WHERE name ILIKE '%Imobiliaria XYZ%'");
    if (tenantRes.rows.length > 0) {
      const tenantId = tenantRes.rows[0].id;
      
      // Pegar todas as features do módulo Mercado Imobiliário
      const featuresRes = await client.query(`
        SELECT feature_id FROM system_feature_modules WHERE module_id = $1
      `, [moduleId]);

      console.log(`Encontradas ${featuresRes.rows.length} funcionalidades para provisionar.`);

      for (const row of featuresRes.rows) {
        await client.query(`
          INSERT INTO tenant_feature_overrides (tenant_id, feature_id, is_active)
          VALUES ($1, $2, true)
          ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true
        `, [tenantId, row.feature_id]);
      }
      
      // Ativar também na tabela role_permissions para o admin da empresa se necessário
      // (Normalmente o sistema já faz isso se as features estiverem em tenant_feature_overrides e marcadas como is_default_tenant_admin_feature)
      
      console.log('Provisionamento granular concluído.');
    }

    await client.query('COMMIT');
    console.log('✅ SUCESSO: Governança restaurada para Mercado Imobiliário!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ ERRO:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixImobiliaria();
