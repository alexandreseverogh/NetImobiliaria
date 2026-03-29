
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function forceSync() {
  const client = new Client({
    host: 'localhost',
    port: 15432,
    user: 'postgres',
    password: 'postgres',
    database: 'net_imobiliaria',
  });

  try {
    await client.connect();
    console.log('🧹 [Force-Sync] Limpando jobs travados (PROCESSING -> FAILED)...');
    const res1 = await client.query("UPDATE feed.feed_jobs SET status = 'FAILED', log_erro = 'Reset manual pós-deploy' WHERE status = 'PROCESSING'");
    console.log(`✅ Jobs resetados: ${res1.rowCount}`);

    console.log('🆕 [Force-Sync] Criando novo job para Casa Vogue (ID 4)...');
    const res2 = await client.query("INSERT INTO feed.feed_jobs (fonte_fk, status, created_at) VALUES (4, 'PENDING', NOW()) RETURNING id");
    console.log(`✅ Job #${res2.rows[0].id} criado.`);

    console.log('\n🚀 [Force-Sync] Disparando processador...\n');
    // Chamar o processador diretamente via require
    const { processAllPendingJobs } = require('./feed-cron-processor.js');
    await processAllPendingJobs();

    console.log('\n✅ [Force-Sync] Sincronização manual concluída.');
  } catch (err) {
    console.error('❌ Erro no Force-Sync:', err);
  } finally {
    await client.end();
  }
}

forceSync();
