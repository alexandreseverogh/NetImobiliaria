/**
 * Script para processar todos os jobs pendentes imediatamente
 * Útil para testar ou processar jobs manualmente
 */

require('dotenv').config({ path: '.env.local' });

const { processAllPendingJobs } = require('./feed-cron-processor');

console.log('🔄 Processando jobs pendentes...\n');

processAllPendingJobs()
  .then((count) => {
    if (count > 0) {
      console.log(`\n✅ Processamento concluído: ${count} jobs processados\n`);
    } else {
      console.log('\nℹ️ Nenhum job pendente para processar\n');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro ao processar jobs:', error);
    process.exit(1);
  });
