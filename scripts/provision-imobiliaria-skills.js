const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function setupImobiliariaSkills() {
  try {
    console.log('--- CONFIGURANDO SUPERPODERES NO SEGMENTO IMOBILIÁRIO ---');
    
    // 1. Localizar o ID do módulo 'Administrativo' ou 'CRM de Vendas' 
    const moduleRes = await pool.query("SELECT id FROM system_modules WHERE name IN ('Administrativo', 'CRM de Vendas')");
    const moduleIds = moduleRes.rows.map(r => r.id);

    if (moduleIds.length === 0) {
      console.log('Módulos principais não encontrados.');
      return;
    }

    // 2. Criar ou Atualizar as Features de Elite como SKILLS
    const skillsToSetup = [
      {
        name: 'Artemis AI Lead Scorer',
        slug: 'artemis-ai-lead-scorer',
        category: 'Dashboard / Relatórios',
        metadata: {
          type: 'AI',
          requirements: [
            { id: 'price_field', label: 'Campo de Valor Comercial', target: 'imoveis' },
            { id: 'lead_name_field', label: 'Campo de Nome do Lead', target: 'imovel_prospects' }
          ]
        }
      },
      {
        name: 'Revenue Intelligence Elite',
        slug: 'revenue-intelligence-elite',
        category: 'Gestão Administrativa',
        metadata: {
          type: 'BI',
          requirements: [
            { id: 'venda_field', label: 'Campo de Venda (Imóveis)', target: 'imoveis' }
          ]
        }
      }
    ];

    for (const skill of skillsToSetup) {
      // Garantir categoria
      const catRes = await pool.query("SELECT id FROM system_categorias WHERE name = $1 LIMIT 1", [skill.category]);
      const catId = catRes.rows.length > 0 ? catRes.rows[0].id : null;

      // Upsert na Feature
      const upsertRes = await pool.query(`
        INSERT INTO system_features (name, slug, category_id, is_active, is_skill, skill_metadata)
        VALUES ($1, $2, $3, true, true, $4)
        ON CONFLICT (slug) DO UPDATE 
        SET is_skill = true, skill_metadata = $4, category_id = $3
        RETURNING id
      `, [skill.name, skill.slug, catId, JSON.stringify(skill.metadata)]);

      const featureId = upsertRes.rows[0].id;

      // Vincular ao primeiro módulo encontrado (ex: ADMINISTRATIVO)
      await pool.query(`
        INSERT INTO system_feature_modules (feature_id, module_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [featureId, moduleIds[0]]);

      console.log(`✅ Skill '${skill.name}' configurada e vinculada ao módulo.`);
    }

  } catch (err) {
    console.error('Erro no setup de skills:', err);
  } finally {
    await pool.end();
  }
}

setupImobiliariaSkills();
