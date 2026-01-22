/**
 * Agendador de Cron para Transbordo de Leads
 * 
 * Este script deve rodar continuamente e chamar o endpoint de verificação de leads expirados.
 * 
 * Execute: node scripts/transbordo-scheduler.js
 * Ou via PM2 em produção.
 */

require('dotenv').config({ path: '.env.local' });
const cron = require('node-cron');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || '';

async function runTransbordoCheck() {
    try {
        console.log(`🕐 [${new Date().toISOString()}] Verificando leads expirados...`);

        // Chama o endpoint da API (que contém a lógica do banco e email)
        const response = await fetch(`${API_BASE_URL}/api/cron/transbordo`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CRON_SECRET}`,
            },
        });

        if (response.ok) {
            const data = await response.json();
            if (data.summary.processed > 0 || data.debug) {
                console.log(`✅ [Transbordo] Dados:`, data);
            } else {
                console.log(`ℹ️ [Transbordo] Nenhum lead expirado.`);
            }
        } else {
            const text = await response.text();
            console.error(`❌ [Transbordo] Erro na API (${response.status}):`, text.substring(0, 200));
        }
    } catch (error) {
        console.error('❌ [Transbordo] Erro de conexão:', error.message);
    }
}

// Configurar cron: Rodar a cada 5 minutos
// Expressão: "*/5 * * * *"
console.log('⏰ Configurando agendador de Transbordo (Leads)...\n');

cron.schedule('*/5 * * * *', async () => {
    await runTransbordoCheck();
}, {
    scheduled: true,
    timezone: 'America/Sao_Paulo'
});

console.log('✅ Agendador de Transbordo iniciado (a cada 5 min).');
console.log('🚀 Aguardando ticks... (Ctrl+C para parar)\n');

// Execução imediata ao iniciar para não esperar 5 min
runTransbordoCheck();
