const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seedSkills() {
  try {
    console.log('--- REGISTRANDO PRIMEIRAS SUPERPOWER SKILLS (IDs REAIS) ---');

    // 1. Marcar funcionalidades como Skills em system_features
    await pool.query(`
      UPDATE public.system_features 
      SET is_skill = true, 
          skill_type = 'UI_PREMIUM',
          skill_metadata = '{"category": "Analytics", "premium_level": "Elite"}'
      WHERE id IN (19, 57, 66, 71);
    `);

    // 2. Criar os Manifestos
    await pool.query(`
      INSERT INTO public.system_skill_manifest 
        (feature_id, name, description, skill_icon, component_path, is_premium)
      VALUES 
        (19, 'Executive Dashboard Pro', 'Interface de alta performance com KPIs em tempo real e design glassmorphism.', 'chart-bar', '@/components/skills/premium/ExecutiveDashboard', true),
        (57, 'Revenue Intelligence', 'Skill de análise de receitas para corretores com previsibilidade algorítmica.', 'currency-dollar', '@/components/skills/premium/RevenueIntelligence', true),
        (66, 'Kanban Ultra-High Performance', 'Acelerador de produtividade para gestão de leads com drag-and-drop inteligente.', 'view-columns', '@/components/skills/premium/KanbanLeads', true),
        (71, 'Artemis AI Lead Scorer', 'Motor de inteligência artificial que classifica a probabilidade de fechamento de cada lead.', 'sparkles', '@/components/skills/ai/LeadScorer', true)
      ON CONFLICT (feature_id) DO NOTHING;
    `);

    console.log('✅ Skills registradas com sucesso no Manifesto Real!');

  } catch (err) {
    console.error('❌ Erro ao registrar skills:', err);
  } finally {
    await pool.end();
  }
}

seedSkills();
