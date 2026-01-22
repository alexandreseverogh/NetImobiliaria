
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 15432, // FORCE PORT
});

const PROSPECT_ID = 51;

async function run() {
    const client = await pool.connect();
    try {
        console.log('--- DEBUG TRANSBORDO LOGIC ---');

        // 1. Params
        const pRes = await client.query('SELECT proximos_corretores_recebem_leads, proximos_corretores_recebem_leads_internos FROM parametros LIMIT 1');
        const limitExternal = parseInt(pRes.rows[0]?.proximos_corretores_recebem_leads || '3');
        const limitInternal = parseInt(pRes.rows[0]?.proximos_corretores_recebem_leads_internos || '3');
        console.log(`Limits -> External: ${limitExternal}, Internal: ${limitInternal}`);

        // 2. History
        const hRes = await client.query(`
      SELECT pa.corretor_fk, u.tipo_corretor, u.is_plantonista, pa.status
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = $1
    `, [PROSPECT_ID]);

        const historyAll = hRes.rows;
        const history = historyAll.slice(0, -1);
        console.log(`History Count (Original: ${historyAll.length}, Sliced: ${history.length})`);
        history.forEach((h, i) => {
            console.log(`  ${i + 1}. [${h.tipo_corretor}] IsPlant:${h.is_plantonista} Status:${h.status}`);
        });

        // 3. Counting Logic (COPIED FROM CRON)
        const externalAttempts = history.filter(r =>
            (r.tipo_corretor === 'Externo' || !r.tipo_corretor) && !r.is_plantonista
            // Note: checking if !tipo_corretor default is handled in DB or code. Cron code: (r.tipo_corretor === 'Externo') && !r.is_plantonista
            // My previous view of Cron code: (r.tipo_corretor === 'Externo') && !r.is_plantonista
        ).length;

        // Wait, let's look at EXACT Cron code I wrote in Step 806/808?
        // "const externalAttempts = historyRes.rows.filter(r => (r.tipo_corretor === 'Externo') && !r.is_plantonista).length;"
        // Check if 'Externo' matches exact string in DB (Case sensitive?)
        // DB usually has 'Externo' capitalized.

        // Let's refine the filter to match exactly what is in DB
        const countExternal = history.filter(r => r.tipo_corretor === 'Externo' && !r.is_plantonista).length;
        const countInternal = history.filter(r => r.tipo_corretor === 'Interno' && !r.is_plantonista).length;

        console.log(`Calculated Attempts -> External: ${countExternal}, Internal: ${countInternal}`);

        // 4. Decision Logic
        let targetTier = 'External';
        if (countExternal < limitExternal && countInternal === 0) {
            targetTier = 'External';
        } else if (countInternal < limitInternal) {
            targetTier = 'Internal';
        } else {
            targetTier = 'Plantonista';
        }

        console.log(`DECISION: Target Tier = ${targetTier}`);

        if (targetTier === 'Internal') {
            console.log('✅ Logic correctly switches to INTERNAL.');
        } else if (targetTier === 'External') {
            console.log('⚠️ Logic stays on EXTERNAL (Limit not reached).');
        } else {
            console.log('❌ Logic skips to PLANTONISTA.');
        }

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

run();
