const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function check() {
    try {
        const res = await pool.query('SELECT * FROM parametros LIMIT 1');
        console.log('Parametros:', res.rows[0]);

        // Check if new columns exist
        if (res.rows[0].proximos_corretores_recebem_leads_internos !== undefined) {
            console.log('✅ Column proximos_corretores_recebem_leads_internos exists:', res.rows[0].proximos_corretores_recebem_leads_internos);
        } else {
            console.error('❌ Column proximos_corretores_recebem_leads_internos MISSING');
        }

        if (res.rows[0].sla_minutos_aceite_lead_interno !== undefined) {
            console.log('✅ Column sla_minutos_aceite_lead_interno exists:', res.rows[0].sla_minutos_aceite_lead_interno);
        } else {
            console.error('❌ Column sla_minutos_aceite_lead_interno MISSING');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

check();
