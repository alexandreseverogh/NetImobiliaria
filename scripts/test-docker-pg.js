const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres'
    // No password - container uses trust authentication
});

async function quickTest() {
    try {
        console.log('🔍 Testing Docker PostgreSQL connection (port 15432)...\n');

        const client = await pool.connect();
        console.log('✅ Connected successfully!');

        const versionResult = await client.query('SELECT version()');
        console.log(`📊 PostgreSQL: ${versionResult.rows[0].version.split(',')[0]}`);

        const dbResult = await client.query('SELECT current_database()');
        console.log(`📁 Database: ${dbResult.rows[0].current_database}`);

        // Check parametros table
        const paramResult = await client.query(`
      SELECT 
        proximos_corretores_recebem_leads,
        sla_minutos_aceite_lead,
        proximos_corretores_recebem_leads_internos,
        sla_minutos_aceite_lead_interno
      FROM public.parametros
      LIMIT 1
    `);

        if (paramResult.rows.length > 0) {
            console.log('\n✅ Guardian Config found in database:');
            console.log(`   External limit: ${paramResult.rows[0].proximos_corretores_recebem_leads}`);
            console.log(`   External SLA: ${paramResult.rows[0].sla_minutos_aceite_lead} min`);
            console.log(`   Internal limit: ${paramResult.rows[0].proximos_corretores_recebem_leads_internos}`);
            console.log(`   Internal SLA: ${paramResult.rows[0].sla_minutos_aceite_lead_interno} min`);
            console.log('\n🎯 Guardian is ready to use!');
        } else {
            console.log('\n⚠️  No config found in parametros table');
        }

        client.release();
        await pool.end();

    } catch (error) {
        console.error('❌ Error:', error.message);
        await pool.end();
    }
}

quickTest();
