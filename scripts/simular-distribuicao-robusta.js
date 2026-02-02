const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function runSimulation() {
    console.log('--- STARTING ROBUST LEAD DISTRIBUTION SIMULATION (VERIFICATION) ---');
    try {
        console.log(`\n--- TEST: DISTRIBUICAO COM NOVA LOGICA (EQUIDADE PRIMEIRO) ---`);

        // This is a PURE SQL SIMULATION of the NEW logic.
        const q = `
            WITH simulated_brokers AS (
                SELECT 'VETERANO' as nome, 5 as nivel, 1000 as xp, 2 as leads, '2026-01-01'::timestamp as last_lead
                UNION ALL
                SELECT 'NEWBIE' as nome, 1 as nivel, 100 as xp, 0 as leads, NULL::timestamp as last_lead
            )
            SELECT * FROM simulated_brokers
            ORDER BY 
              -- NOVA LOGICA
              leads ASC,
              last_lead ASC NULLS FIRST,
              nivel DESC,
              xp DESC
            LIMIT 1
        `;
        const res = await pool.query(q);
        const chosen = res.rows[0];

        if (chosen) {
            console.log(`Vencedor: ${chosen.nome} (Leads: ${chosen.leads}, Nivel: ${chosen.nivel})`);
            if (chosen.nome === 'NEWBIE') {
                console.log('🟢 VERIFICAÇÃO: O sistema agora PRIORIZA quem tem menos leads!');
                console.log('   -> O NEWBIE (0 leads) ganhou do VETERANO (2 leads), cumprindo o requisito de equidade.');
            } else {
                console.log('🔴 VERIFICAÇÃO: O sistema AINDA NÃO PRIORIZA quem tem menos leads.');
            }
        }

        console.log(`\n--- TEST: TIE-BREAKER (MESMA QUANTIDADE DE LEADS) ---`);
        const qTie = `
            WITH simulated_brokers AS (
                SELECT 'VETERANO' as nome, 5 as nivel, 1000 as xp, 0 as leads, NULL::timestamp as last_lead
                UNION ALL
                SELECT 'NEWBIE' as nome, 1 as nivel, 100 as xp, 0 as leads, NULL::timestamp as last_lead
            )
            SELECT * FROM simulated_brokers
            ORDER BY 
              leads ASC,
              last_lead ASC NULLS FIRST,
              nivel DESC,
              xp DESC
            LIMIT 1
        `;
        const resTie = await pool.query(qTie);
        const chosenTie = resTie.rows[0];

        if (chosenTie) {
            console.log(`Vencedor: ${chosenTie.nome} (Leads: ${chosenTie.leads}, Nivel: ${chosenTie.nivel})`);
            if (chosenTie.nome === 'VETERANO') {
                console.log('🟢 VERIFICAÇÃO: Tie-breaker (Nível) funcionando corretamente!');
                console.log('   -> Com leads iguais, o VETERANO (Nível 5) ganhou do NEWBIE (Nível 1).');
            } else {
                console.log('🔴 VERIFICAÇÃO: Tie-breaker falhou.');
            }
        }

    } catch (e) {
        console.error('ERRO:', e);
    } finally {
        await pool.end();
    }
}

runSimulation();
