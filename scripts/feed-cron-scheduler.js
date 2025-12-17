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
    
    exec('node scripts/create-feed-jobs.js', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ [Cron] Erro ao criar jobs:', error);
        return;
      }
      console.log(stdout);
    });
  } catch (error) {
    console.error('❌ [Cron] Erro ao criar jobs:', error);
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

// 1. Criar novos jobs a cada hora (no minuto 0)
cron.schedule('0 * * * *', async () => {
  console.log(`\n🕐 [${new Date().toISOString()}] Executando criação de jobs...`);
  await createJobs();
  // Após criar jobs, processar imediatamente
  await processAllPendingJobs();
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

// 2. Processar jobs pendentes a cada 15 minutos (caso algum tenha falhado)
cron.schedule('*/15 * * * *', async () => {
  console.log(`\n🕐 [${new Date().toISOString()}] Verificando jobs pendentes...`);
  await processAllPendingJobs();
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

console.log('✅ Agendador configurado:');
console.log('   📅 Criação de jobs: A cada hora (minuto 0)');
console.log('   📅 Processamento: A cada 15 minutos');
console.log('\n🚀 Agendador rodando... (Ctrl+C para parar)\n');

// Processar jobs pendentes imediatamente ao iniciar
console.log('🔄 Processando jobs pendentes existentes...');
processAllPendingJobs()
  .then((count) => {
    if (count > 0) {
      console.log('✅ Inicialização concluída\n');
    } else {
      console.log('ℹ️ Nenhum job pendente para processar\n');
    }
  })
  .catch((error) => {
    console.error('❌ Erro ao processar jobs iniciais:', error.message);
    console.log('💡 Verifique se o banco de dados está acessível\n');
  });

