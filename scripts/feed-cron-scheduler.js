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

// Rodar uma sincronização imediata ao subir o container.
// Isso evita que uma nova máquina fique "parada" até o próximo tick do cron.
(async () => {
  try {
    console.log('🔄 [Cron] Inicialização: criando jobs agora (boot sync)...');
    await createJobs();
  } catch (e) {
    console.warn('⚠️ [Cron] Inicialização: falha ao criar jobs (continuando mesmo assim):', e?.message || e);
  }

  try {
    console.log('🔄 [Cron] Inicialização: processando jobs pendentes (boot sync)...');
    const count = await processAllPendingJobs();
    if (count > 0) {
      console.log('✅ [Cron] Inicialização concluída (jobs processados)\n');
    } else {
      console.log('ℹ️ [Cron] Inicialização concluída (nenhum job pendente)\n');
    }
  } catch (error) {
    console.error('❌ [Cron] Erro ao processar jobs iniciais:', error?.message || error);
    console.log('💡 Verifique se o banco de dados está acessível\n');
  }
})();

