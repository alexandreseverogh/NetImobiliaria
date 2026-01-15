
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkAndKillLocks() {
    try {
        // 1. List locks
        const res = await pool.query(`
      SELECT 
        pid, 
        usename, 
        application_name, 
        state, 
        query_start, 
        query
      FROM pg_stat_activity
      WHERE query ILIKE '%imovel_prospect_atribuicoes%'
        AND state != 'idle'
        AND pid <> pg_backend_pid()
    `);

        console.log(`Encontradas ${res.rowCount} sessões ativas/bloqueantes.`);

        if (res.rowCount > 0) {
            console.table(res.rows.map(r => ({ pid: r.pid, state: r.state, app: r.application_name, query: r.query.substring(0, 50) + '...' })));

            // 2. Kill them
            console.log('Tentando encerrar sessões...');
            for (const row of res.rows) {
                await pool.query('SELECT pg_terminate_backend($1)', [row.pid]);
                console.log(`❌ Sessão PID ${row.pid} encerrada.`);
            }
        } else {
            console.log('Nenhum lock ativo detectado especificamente nesta tabela.');
        }

        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

checkAndKillLocks();
