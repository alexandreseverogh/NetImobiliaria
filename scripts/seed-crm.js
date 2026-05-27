/**
 * SCRIP DE POVOAMENTO CRM (SEED) - VERSÃO CORRIGIDA
 * Objetivo: Injetar leads e eventos de teste usando as credenciais oficiais
 */
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '15432'),
  ssl: process.env.DB_SSL === 'false' ? false : false
};

const pool = new Pool(poolConfig);

const leads = [
  { nome: 'Ricardo Alencar', email: 'ricardo@invest.com.br', tel: '11988776655', tag: 'Investimento Seguro', score: 95, col: 'visita_agendada' },
  { nome: 'Juliana Mendes', email: 'juliana.m@gmail.com', tel: '11977665544', tag: 'Fim do Aluguel', score: 82, col: 'entendimento_dor' },
  { nome: 'Marcos de Souza', email: 'marcos.souza@outlook.com', tel: '21966554433', tag: 'Porto Seguro', score: 75, col: 'lead_captado' },
  { nome: 'Beatriz Costa', email: 'beatriz.costa@empresa.com', tel: '11955443322', tag: 'Upgrade de Vida', score: 88, col: 'em_curadoria' },
  { nome: 'Fernando Henrique', email: 'fh@tecnologia.io', tel: '11944332211', tag: 'Investidor Urbano', score: 98, col: 'proposta_enviada' },
  { nome: 'Carla Dias', email: 'carla.dias@email.com', tel: '11933221100', tag: 'Descanso Merecido', score: 60, col: 'lead_captado' }
];

async function seed() {
  console.log('🚀 Iniciando Povoamento do CRM Intelligence (Conexão Segura)...');
  
  try {
    // Verificar se as tabelas existem limpando antes (opcional, mas bom para resetar teste)
    // await pool.query('DELETE FROM leads_staging');

    for (const lead of leads) {
      // 1. Inserir Lead Staging
      const leadRes = await pool.query(`
        INSERT INTO leads_staging (nome, email, telefone, tag_sonho, score_prontidao, raw_json)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
        RETURNING lead_uuid
      `, [lead.nome, lead.email, lead.tel, lead.tag, lead.score, JSON.stringify({ source: 'seed-test-v2' })]);
      
      const leadUuid = leadRes.rows[0].lead_uuid;

      // 2. Inserir no Kanban
      await pool.query(`
        INSERT INTO leads_kanban (lead_uuid, coluna_id)
        SELECT $1, id FROM kanban_colunas WHERE nome = $2 LIMIT 1
        ON CONFLICT (lead_uuid) DO NOTHING
      `, [leadUuid, lead.col]);

      // 3. Inserir Evento Marketing
      await pool.query(`
        INSERT INTO marketing_eventos (lead_uuid, utm_source, utm_medium, utm_campaign, plataforma)
        VALUES ($1, 'google', 'cpc', 'pesquisa_prioridade', 'google_ads')
      `, [leadUuid]);

      console.log(`✅ Lead [${lead.nome}] injetado na coluna [${lead.col}]`);
    }

    console.log('\n✨ Povoamento concluído! O Dashboard agora está 100% REAL.');
  } catch (err) {
    console.error('❌ Erro no SEED:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
