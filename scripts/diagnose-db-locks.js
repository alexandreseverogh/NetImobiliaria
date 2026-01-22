const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '15432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'net_imobiliaria',
});

async function diagnose() {
    const client = await pool.connect();
    try {
        console.log('--- RELATÓRIO DE LOCKS NO POSTGRES ---');

        console.log('\n1. Verificando bloqueios ativos nas tabelas prospect...');
        const lockQuery = `
      SELECT
          a.pid,
          a.usename,
          a.application_name,
          a.client_addr,
          a.query_start,
          now() - a.query_start AS duration,
          a.state,
          l.mode,
          l.locktype,
          l.granted,
          l.relation::regclass AS table_name,
          a.query
      FROM pg_stat_activity a
      JOIN pg_locks l ON a.pid = l.pid
      WHERE l.relation::regclass::text IN ('imovel_prospects', 'imovel_prospect_atribuicoes')
      ORDER BY a.query_start;
    `;
        const lockResult = await client.query(lockQuery);

        if (lockResult.rows.length === 0) {
            console.log('Nenhum lock encontrado especificamente nestas tabelas.');
        } else {
            console.table(lockResult.rows.map(r => ({
                pid: r.pid,
                table: r.table_name,
                mode: r.mode,
                granted: r.granted,
                duration: r.duration,
                query: r.query.substring(0, 100) + '...'
            })));
        }

        console.log('\n2. Verificando processos "Waiting" (bloqueados)...');
        const waitingQuery = `
      SELECT pid, usename, state, wait_event_type, wait_event, query, now() - query_start AS duration
      FROM pg_stat_activity
      WHERE wait_event IS NOT NULL AND state != 'idle';
    `;
        const waitingResult = await client.query(waitingQuery);
        if (waitingResult.rows.length === 0) {
            console.log('Nenhum processo em espera encontrado.');
        } else {
            console.table(waitingResult.rows.map(r => ({
                pid: r.pid,
                state: r.state,
                event: r.wait_event,
                duration: r.duration,
                query: r.query.substring(0, 100) + '...'
            })));
        }

        console.log('\n3. Verificando processos que estão bloqueando outros...');
        const blockingQuery = `
      SELECT
        blocked_locks.pid     AS blocked_pid,
        blocked_activity.usename  AS blocked_user,
        blocking_locks.pid     AS blocking_pid,
        blocking_activity.usename AS blocking_user,
        blocked_activity.query    AS blocked_statement,
        blocking_activity.query   AS current_statement_in_blocking_process
      FROM  pg_catalog.pg_locks         blocked_locks
      JOIN pg_catalog.pg_stat_activity blocked_activity  ON blocked_locks.pid = blocked_activity.pid
      JOIN pg_catalog.pg_locks         blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
      JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_locks.pid = blocking_activity.pid
      WHERE NOT blocked_locks.granted;
    `;
        const blockingResult = await client.query(blockingQuery);
        if (blockingResult.rows.length === 0) {
            console.log('Nenhuma árvore de bloqueio encontrada.');
        } else {
            console.table(blockingResult.rows);
        }

    } catch (err) {
        console.error('Erro ao diagnosticar:', err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

diagnose();
