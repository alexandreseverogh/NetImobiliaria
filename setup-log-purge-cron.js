const { Pool } = require('pg');
const cron = require('node-cron');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'Roberto@2007'
});

// Configuração do cron job para expurgo automático
// Executa todo dia às 2:00 da manhã
const PURGE_CRON_SCHEDULE = '0 2 * * *'; // Diário às 2:00
const RETENTION_DAYS = 90; // Manter logs por 90 dias

async function executePurge() {
  try {
    console.log('🕐 Iniciando expurgo automático de logs...');
    
    const client = await pool.connect();
    
    try {
      // Obter estatísticas antes do expurgo
      const statsBefore = await client.query('SELECT * FROM get_login_logs_stats()');
      console.log('📊 Estatísticas antes do expurgo:', statsBefore.rows[0]);
      
      // Executar expurgo
      const purgeResult = await client.query(
        'SELECT * FROM purge_old_login_logs($1)',
        [RETENTION_DAYS]
      );
      
      const result = purgeResult.rows[0];
      
      if (result.deleted_count > 0) {
        console.log(`✅ Expurgo concluído: ${result.deleted_count} registros removidos`);
        console.log(`📅 Data mais antiga mantida: ${result.oldest_kept_date}`);
        console.log(`📅 Data mais recente removida: ${result.newest_deleted_date}`);
      } else {
        console.log('ℹ️ Nenhum registro antigo encontrado para remoção');
      }
      
      // Log da operação
      await client.query(`
        INSERT INTO audit_logs (
          user_id, 
          action, 
          resource, 
          resource_id, 
          details, 
          ip_address, 
          created_at
        ) VALUES (
          '00000000-00000000-00000000-00000000'::uuid,
          'AUTO_PURGE_LOGS',
          'login_logs',
          NULL,
          $1,
          '127.0.0.1',
          NOW()
        )
      `, [JSON.stringify({
        retention_days: RETENTION_DAYS,
        deleted_count: result.deleted_count,
        oldest_kept_date: result.oldest_kept_date,
        newest_deleted_date: result.newest_deleted_date,
        stats_before: statsBefore.rows[0]
      })]);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Erro durante expurgo automático:', error);
    
    // Log do erro
    try {
      const client = await pool.connect();
      await client.query(`
        INSERT INTO audit_logs (
          user_id, 
          action, 
          resource, 
          resource_id, 
          details, 
          ip_address, 
          created_at
        ) VALUES (
          '00000000-00000000-00000000-00000000'::uuid,
          'AUTO_PURGE_ERROR',
          'login_logs',
          NULL,
          $1,
          '127.0.0.1',
          NOW()
        )
      `, [JSON.stringify({
        error: error.message,
        retention_days: RETENTION_DAYS
      })]);
      client.release();
    } catch (logError) {
      console.error('❌ Erro ao registrar falha no log:', logError);
    }
  }
}

// Configurar cron job
function setupCronJob() {
  console.log('⏰ Configurando cron job para expurgo automático...');
  console.log(`📅 Agendamento: ${PURGE_CRON_SCHEDULE} (diário às 2:00)`);
  console.log(`🗓️ Retenção: ${RETENTION_DAYS} dias`);
  
  const task = cron.schedule(PURGE_CRON_SCHEDULE, executePurge, {
    scheduled: false, // Não iniciar automaticamente
    timezone: "America/Sao_Paulo"
  });
  
  return task;
}

// Função para testar o expurgo manualmente
async function testPurge() {
  console.log('🧪 Testando expurgo manual...');
  await executePurge();
}

// Função para obter estatísticas
async function getStats() {
  try {
    const client = await pool.connect();
    const stats = await client.query('SELECT * FROM get_login_logs_stats()');
    console.log('📊 Estatísticas atuais dos logs:', stats.rows[0]);
    client.release();
  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
  }
}

// Exportar funções para uso
module.exports = {
  setupCronJob,
  executePurge,
  testPurge,
  getStats
};

// Se executado diretamente, mostrar estatísticas
if (require.main === module) {
  getStats().then(() => {
    console.log('\n💡 Para iniciar o cron job, use:');
    console.log('const { setupCronJob } = require("./setup-log-purge-cron.js");');
    console.log('const task = setupCronJob();');
    console.log('task.start();');
  });
}




