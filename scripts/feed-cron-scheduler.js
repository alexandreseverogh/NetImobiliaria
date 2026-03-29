/**
 * Agendador de Cron para Feed de Conteúdos
 * 
 * Este script deve rodar continuamente e:
 * 1. Criar jobs de sincronização periodicamente (a cada hora)
 * 2. Chamar o endpoint de processamento para processar jobs pendentes
 * 
 * Execute: node scripts/feed-cron-scheduler.js
 * Ou configure como serviço/systemd
 */

require('dotenv').config({ path: '.env.local' });
const cron = require('node-cron');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';

/**
 * Cria novos jobs na fila
 */
async function createJobs() {
  try {
    console.log('🔄 [Cron] Criando jobs de sincronização...');
    const { exec } = require('child_process');

    // IMPORTANTE:
    // `exec` é assíncrono via callback. Sem retornar uma Promise, o scheduler
    // "acha" que terminou e já tenta processar jobs antes deles existirem.
    // Isso causa sensação de "feed defasado" (especialmente em máquina nova).
    return await new Promise((resolve, reject) => {
      exec('node scripts/create-feed-jobs.js', (error, stdout, stderr) => {
        if (stdout) console.log(stdout);
        if (stderr) console.warn(stderr);
        if (error) {
          console.error('❌ [Cron] Erro ao criar jobs:', error);
          reject(error);
          return;
        }
        resolve(true);
      });
    });
  } catch (error) {
    console.error('❌ [Cron] Erro ao criar jobs:', error);
    throw error;
  }
}

/**
 * Processa jobs pendentes
 */
async function processJobs() {
  try {
    console.log('⚙️ [Cron] Processando jobs pendentes...');
    
    const response = await fetch(`${API_BASE_URL}/api/cron/feed-sync`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`✅ [Cron] Job processado: ${data.jobId}, ${data.savedCount} itens salvos`);
    } else if (response.ok && data.message === 'Nenhum job pendente.') {
      console.log('ℹ️ [Cron] Nenhum job pendente no momento');
    } else {
      console.error('❌ [Cron] Erro ao processar job:', data);
    }
  } catch (error) {
    console.error('❌ [Cron] Erro ao processar jobs:', error);
  }
}

/**
 * Processa múltiplos jobs até não haver mais pendentes
 * Usa processamento direto (sem depender da API HTTP)
 */
async function processAllPendingJobs() {
  // Tentar usar processador direto primeiro (não depende do servidor Next.js)
  try {
    const { processAllPendingJobs: processDirect } = require('./feed-cron-processor.js');
    return await processDirect();
  } catch (error) {
    console.warn('⚠️ [Cron] Processador direto não disponível, tentando API HTTP...');
    
    // Fallback para API HTTP (se servidor Next.js estiver rodando)
    let processedCount = 0;
    let maxIterations = 50;
    
    while (maxIterations > 0) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/cron/feed-sync`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${CRON_SECRET}`,
          },
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          processedCount++;
          console.log(`✅ [Cron] Job #${data.jobId} processado (${data.savedCount} itens)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else if (response.ok && data.message === 'Nenhum job pendente.') {
          break;
        } else {
          console.error('❌ [Cron] Erro:', data);
          break;
        }
      } catch (fetchError) {
        console.error('❌ [Cron] Erro ao conectar à API:', fetchError.message);
        console.log('💡 Dica: Inicie o servidor Next.js com: npm run dev');
        break;
      }
      
      maxIterations--;
    }
    
    if (processedCount > 0) {
      console.log(`\n✅ [Cron] Processamento concluído: ${processedCount} jobs processados\n`);
    }
    
    return processedCount;
  }
}

// Configurar cron jobs
console.log('⏰ Configurando agendador de feeds...\n');

// 1. Criar e processar jobs uma única vez ao dia (às 03:00 da manhã)
cron.schedule('0 3 * * *', async () => {
  console.log(`\n🕐 [${new Date().toISOString()}] Executando sincronização diária de feeds...`);
  try {
    const { processAllPendingJobs: processDirect, cleanupOldFeeds } = require('./feed-cron-processor.js');
    
    // Passo 1: Limpar feeds antigos (mais de 7 dias) para manter histórico enxuto
    await cleanupOldFeeds(7);
    
    // Passo 2: Criar e processar novos jobs
    await createJobs();
    await processDirect();
    
    console.log(`✅ [${new Date().toISOString()}] Sincronização e limpeza concluídas.`);
  } catch (error) {
    console.error(`❌ [${new Date().toISOString()}] Erro na sincronização diária:`, error);
  }
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

console.log('✅ Agendador configurado para execução diária às 03:00 (America/Sao_Paulo).');
console.log('\n🚀 Agendador rodando... (Ctrl+C para parar)\n');

// Removido o boot sync imediato para respeitar a janela das 03:00h conforme solicitado pelo usuário.

