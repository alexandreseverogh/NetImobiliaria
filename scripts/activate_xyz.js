const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function activateSkill() {
  try {
    const query = `
      INSERT INTO tenant_feature_overrides (tenant_id, feature_id, is_active, skill_config) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (tenant_id, feature_id) 
      DO UPDATE SET is_active = $3, skill_config = $4
    `;
    const params = [
      'c828d003-6213-4464-aa38-6c5d10a0aa9a', // XYZ
      19,                                     // Dashboard
      true,                                   // On
      JSON.stringify({ primary_color: '#F59E0B' }) // Cor customizada (Laranja Master)
    ];
    
    await pool.query(query, params);
    console.log('✅ Dashboard Superpower ATIVADO com sucesso para Imobiliaria XYZ!');
    console.log('🎨 Parametrização aplicada: Cor Primária #F59E0B');
  } catch (err) {
    console.error('❌ Erro na ativação:', err);
  } finally {
    await pool.end();
  }
}

activateSkill();
