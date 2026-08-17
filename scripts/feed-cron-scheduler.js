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

// 2. EXECUTAR TRANSBORDO E LIMPEZA DE HISTÓRICO (A CADA 5 MINUTOS)
// Regra: Verifica SLAs de corretores, redistribui leads e limpa histórico antigo.
cron.schedule('*/5 * * * *', async () => {
  console.log(`🔄 [${new Date().toISOString()}] Iniciando transbordo de leads e manutenção de histórico...`);
  try {
    const response = await fetch(`${API_BASE_URL}/api/cron/transbordo`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [Cron Transbordo] Erro na resposta (${response.status}):`, errorData);
      return;
    }

    const data = await response.json();
    if (data.success) {
      const { processed, reassigned, to_plantonista } = data.summary;
      console.log(`✅ [Cron Transbordo] Processado: ${processed}, Redistribuído: ${reassigned}, Plantão: ${to_plantonista || 0}`);
    } else {
      console.error('❌ [Cron Transbordo] Erro ao executar:', data.message || data.error);
    }
  } catch (error) {
    console.error('❌ [Cron Transbordo] Erro de conexão:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

// 3. AUDIT REPORT MENSAL — 1º dia do mês às 09:00
// Gera relatório de auditoria (30 dias) para todos os tenants e seus clientes.
cron.schedule('0 9 1 * *', async () => {
  console.log(`\n📊 [${new Date().toISOString()}] Iniciando audit-monthly...`);
  try {
    const response = await fetch(`${API_BASE_URL}/api/cron/campanhas/audit-monthly`, {
      method: 'POST',
      headers: {
        'x-cron-secret': CRON_SECRET,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [audit-monthly] Erro na resposta (${response.status}):`, errorData);
      return;
    }

    const data = await response.json();
    console.log(
      `✅ [audit-monthly] tenants=${data.tenants} reports=${data.totalReports} ok=${data.succeeded} err=${data.failed} ${data.elapsedMs}ms`
    );
  } catch (error) {
    console.error('❌ [audit-monthly] Erro de conexão:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

// 4. AUDIT REPORT SEMANAL — todo domingo às 18:00
// Gera relatório de auditoria (7 dias) para todos os tenants e seus clientes.
cron.schedule('0 18 * * 0', async () => {
  console.log(`\n📊 [${new Date().toISOString()}] Iniciando audit-weekly...`);
  try {
    const response = await fetch(`${API_BASE_URL}/api/cron/campanhas/audit-weekly`, {
      method: 'POST',
      headers: {
        'x-cron-secret': CRON_SECRET,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [audit-weekly] Erro na resposta (${response.status}):`, errorData);
      return;
    }

    const data = await response.json();
    console.log(
      `✅ [audit-weekly] tenants=${data.tenants} reports=${data.totalReports} ok=${data.succeeded} err=${data.failed} ${data.elapsedMs}ms`
    );
  } catch (error) {
    console.error('❌ [audit-weekly] Erro de conexão:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

// 5. REALOCAÇÃO DE VERBA — medição D+14 — diário às 07:00
// docs/PLANO_TIKTOK.md §8.4 — fecha o loop de aprendizado do motor de realocação (T4): mede
// propostas EXECUTED há ≥14 dias, grava verdict, alimenta o circuit breaker (H15).
cron.schedule('0 7 * * *', async () => {
  console.log(`\n💰 [${new Date().toISOString()}] Iniciando realloc-measure...`);
  try {
    const response = await fetch(`${API_BASE_URL}/api/cron/campanhas/realloc-measure`, {
      method: 'POST',
      headers: {
        'x-cron-secret': CRON_SECRET,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ [realloc-measure] Erro na resposta (${response.status}):`, errorData);
      return;
    }

    const data = await response.json();
    console.log(
      `✅ [realloc-measure] measured=${data.measured} byVerdict=${JSON.stringify(data.byVerdict)} ${data.elapsedMs}ms`
    );
  } catch (error) {
    console.error('❌ [realloc-measure] Erro de conexão:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

// FASE 16.F — Publicação orgânica agendada: a cada 5 minutos
cron.schedule('*/5 * * * *', async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cron/campanhas/organic-publish`, {
      method: 'POST',
      headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      console.error(`❌ [organic-publish] Erro (${response.status})`);
      return;
    }
    const data = await response.json();
    if (data.due > 0) {
      console.log(`✅ [organic-publish] due=${data.due} published=${data.published} failed=${data.failed} ${data.elapsedMs}ms`);
    }
  } catch (error) {
    console.error('❌ [organic-publish] Erro de conexão:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

// MENSAGERIA — Varredura de SLA estourado (M3): a cada 5 minutos
// Marca conversas com 1ª resposta atrasada e dispara alerta WhatsApp/Slack do tenant.
cron.schedule('*/5 * * * *', async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cron/mensageria/sla-check`, {
      method: 'POST',
      headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      console.error(`❌ [mensageria-sla-check] Erro (${response.status})`);
      return;
    }
    const data = await response.json();
    if (data.alerted > 0) {
      console.log(`✅ [mensageria-sla-check] scanned=${data.scanned} alerted=${data.alerted}`);
    }
  } catch (error) {
    console.error('❌ [mensageria-sla-check] Erro de conexão:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

// CRM — Agentes de Aceleração, varredura SCHEDULED_SCAN (F1 Velocidade de 1º Contato):
// a cada 5 minutos. docs/PLANO_AGENTES_ACELERACAO_CRM.md.
cron.schedule('*/5 * * * *', async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cron/crm/agentes-scan`, {
      method: 'POST',
      headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      console.error(`❌ [crm-agentes-scan] Erro (${response.status})`);
      return;
    }
    const data = await response.json();
    if (data.fired > 0) {
      console.log(`✅ [crm-agentes-scan] scanned=${data.scanned} fired=${data.fired}`);
    }
  } catch (error) {
    console.error('❌ [crm-agentes-scan] Erro de conexão:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

// CRM — Agentes de Aceleração, recalibração de score (F5): job DIÁRIO, não lead-scoped
// como os outros 4 agentes — nunca passa pelo scan de 5 em 5 min. 04:00, janela de baixo
// tráfego. docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.2.
cron.schedule('0 4 * * *', async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cron/crm/score-recalibration`, {
      method: 'POST',
      headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      console.error(`❌ [crm-score-recalibration] Erro (${response.status})`);
      return;
    }
    const data = await response.json();
    console.log(`✅ [crm-score-recalibration] segments=${data.segmentsProcessed} tenants=${data.tenantsProcessed} suggestions=${data.suggestionsCreated} reordered=${data.reorderedScopes}`);
  } catch (error) {
    console.error('❌ [crm-score-recalibration] Erro de conexão:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

// CRM — Pendência de Atendimento (G0): reconciliação do estado "de quem é a bola".
// Rede de segurança, não caminho principal — a materialização acontece na escrita
// (touchPendency). Este job recomputa da fonte real e corrige divergências; `corrigidos`
// consistentemente > 0 significa que algum caminho de escrita não está chamando o helper.
// 03:30, entre o feed sync (03:00) e a recalibração de score (04:00).
// docs/PLANO_PENDENCIA_ATENDIMENTO.md §5.
cron.schedule('30 3 * * *', async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/cron/crm/pendencia-reconciliar`, {
      method: 'POST',
      headers: { 'x-cron-secret': CRON_SECRET, 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      console.error(`❌ [crm-pendencia-reconciliar] Erro (${response.status})`);
      return;
    }
    const data = await response.json();
    console.log(`✅ [crm-pendencia-reconciliar] corrigidos=${data.corrigidos} em ${data.elapsedMs}ms`);
  } catch (error) {
    console.error('❌ [crm-pendencia-reconciliar] Erro de conexão:', error.message);
  }
}, {
  scheduled: true,
  timezone: 'America/Sao_Paulo'
});

console.log('✅ Agendador configurado:');
console.log('   • Feed sync diário        → 03:00 (America/Sao_Paulo)');
console.log('   • Transbordo de leads     → a cada 5 min');
console.log('   • Audit report mensal     → 1º dia do mês às 09:00');
console.log('   • Audit report semanal    → domingos às 18:00');
console.log('   • Publicação orgânica     → a cada 5 min (agendadas)');
console.log('   • Mensageria SLA check    → a cada 5 min');
console.log('   • CRM agentes (scan)      → a cada 5 min');
console.log('   • CRM pendência (reconc.) → diário às 03:30');
console.log('   • CRM recalibração score  → diário às 04:00');
console.log('\n🚀 Agendador rodando... (Ctrl+C para parar)\n');

// Removido o boot sync imediato para respeitar a janela das 03:00h conforme solicitado pelo usuário.

