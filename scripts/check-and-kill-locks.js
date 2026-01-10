const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const pool = new Pool({
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function checkLocks() {
    try {
        console.log('\n🔍 Verificando locks ativos...\n');

        // Verificar locks nas tabelas de prospects
        const locksRes = await pool.query(`
      SELECT 
        l.locktype,
        l.relation::regclass as table_name,
        l.mode,
        l.granted,
        a.pid,
        a.usename,
        a.application_name,
        a.state,
        a.query,
        a.query_start,
        NOW() - a.query_start as duration
      FROM pg_locks l
      JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE l.relation::regclass::text IN ('imovel_prospects', 'imovel_prospect_atribuicoes')
      ORDER BY a.query_start
    `);

        if (locksRes.rows.length > 0) {
            console.log('🔒 Locks encontrados:');
            console.table(locksRes.rows.map(r => ({
                pid: r.pid,
                table: r.table_name,
                mode: r.mode,
                granted: r.granted,
                state: r.state,
                duration: r.duration,
                query: r.query?.substring(0, 100)
            })));

            // Terminar processos com locks
            for (const lock of locksRes.rows) {
                if (lock.pid) {
                    console.log(`\n🔪 Terminando processo PID ${lock.pid}...`);
                    await pool.query(`SELECT pg_terminate_backend($1)`, [lock.pid]);
                }
            }
            console.log('\n✅ Processos terminados!');
        } else {
            console.log('✅ Nenhum lock encontrado.');
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkLocks();
