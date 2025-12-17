/**
 * Script para criar jobs de sincronização de feeds
 * Este script cria jobs na fila (feed.feed_jobs) para serem processados pelo cron
 * 
 * Execute este script periodicamente (via cron) para criar novos jobs de sincronização
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const poolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(poolConfig);

/**
 * Cria jobs de sincronização para todas as fontes ativas
 */
async function createFeedJobs() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Criando jobs de sincronização de feeds...\n');
    
    // Buscar todas as fontes ativas
    const sourcesResult = await client.query(`
      SELECT id, nome, url_feed, categoria_fk
      FROM feed.feed_fontes
      WHERE ativo = true
      ORDER BY id
    `);
    
    if (sourcesResult.rows.length === 0) {
      console.log('⚠️ Nenhuma fonte ativa encontrada. Execute o seed primeiro: node scripts/seed_feed.js');
      return;
    }
    
    console.log(`📰 Encontradas ${sourcesResult.rows.length} fontes ativas:\n`);
    
    let jobsCreated = 0;
    let jobsSkipped = 0;
    
    for (const fonte of sourcesResult.rows) {
      // Verificar se já existe job pendente para esta fonte
      const existingJob = await client.query(`
        SELECT id FROM feed.feed_jobs
        WHERE fonte_fk = $1 AND status = 'PENDING'
        LIMIT 1
      `, [fonte.id]);
      
      if (existingJob.rows.length > 0) {
        console.log(`⏭️  ${fonte.nome}: Job pendente já existe, pulando...`);
        jobsSkipped++;
        continue;
      }
      
      // Criar novo job
      await client.query(`
        INSERT INTO feed.feed_jobs (fonte_fk, status, created_at)
        VALUES ($1, 'PENDING', NOW())
      `, [fonte.id]);
      
      console.log(`✅ ${fonte.nome}: Job criado com sucesso`);
      jobsCreated++;
    }
    
    console.log(`\n📊 Resumo:`);
    console.log(`   Jobs criados: ${jobsCreated}`);
    console.log(`   Jobs pulados (já existentes): ${jobsSkipped}`);
    console.log(`   Total de fontes: ${sourcesResult.rows.length}\n`);
    
    if (jobsCreated > 0) {
      console.log('🎉 Jobs criados! O cron job processará automaticamente.');
      console.log('💡 Para processar manualmente: GET /api/cron/feed-sync\n');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar jobs:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Executar
createFeedJobs()
  .then(() => {
    console.log('✅ Script concluído');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });

