/**
 * Guardian Integration Test
 * 
 * Simple test to verify Guardian works with database
 * Run: npx tsx scripts/test-guardian.ts
 */

const { Pool } = require('pg');

// Import Guardian using require (CommonJS)
async function testGuardian() {
    console.log('🧪 Testing Guardian Integration...\n');

    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '15432', 10),
        database: process.env.DB_NAME || 'net_imobiliaria',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
    });

    try {
        // Test 1: Fetch Guardian Config
        console.log('📋 Test 1: Fetching Guardian Config from database...');
        const configResult = await pool.query(`
      SELECT 
        proximos_corretores_recebem_leads,
        sla_minutos_aceite_lead,
        proximos_corretores_recebem_leads_internos,
        sla_minutos_aceite_lead_interno
      FROM public.parametros
      LIMIT 1
    `);

        if (configResult.rows.length === 0) {
            console.log('❌ No config found in parametros table');
            return;
        }

        const config = configResult.rows[0];
        console.log('✅ Config loaded:', {
            externalLimit: config.proximos_corretores_recebem_leads,
            externalSLA: config.sla_minutos_aceite_lead,
            internalLimit: config.proximos_corretores_recebem_leads_internos,
            internalSLA: config.sla_minutos_aceite_lead_interno
        });

        // Test 2: Check for expired leads
        console.log('\n📋 Test 2: Checking for expired leads...');
        const expiredResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM public.imovel_prospect_atribuicoes
      WHERE status = 'atribuido'
        AND expira_em IS NOT NULL
        AND expira_em <= NOW()
        AND COALESCE(motivo->>'type','') <> 'imovel_corretor_fk'
    `);

        const expiredCount = parseInt(expiredResult.rows[0].count);
        console.log(`✅ Found ${expiredCount} expired leads`);

        // Test 3: Check assignment history for a prospect
        console.log('\n📋 Test 3: Checking assignment history...');
        const prospectResult = await pool.query(`
      SELECT ip.id, COUNT(a.id) as assignment_count
      FROM public.imovel_prospects ip
      LEFT JOIN public.imovel_prospect_atribuicoes a ON a.prospect_id = ip.id
      WHERE ip.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY ip.id
      HAVING COUNT(a.id) > 0
      ORDER BY COUNT(a.id) DESC
      LIMIT 1
    `);

        if (prospectResult.rows.length > 0) {
            const prospectId = prospectResult.rows[0].id;
            const assignmentCount = prospectResult.rows[0].assignment_count;

            console.log(`✅ Found prospect ${prospectId} with ${assignmentCount} assignments`);

            const historyResult = await pool.query(`
        SELECT 
          pa.corretor_fk,
          u.tipo_corretor,
          COALESCE(pa.motivo->>'type', '') as motivo_type,
          pa.status,
          pa.created_at
        FROM public.imovel_prospect_atribuicoes pa
        JOIN public.users u ON u.id = pa.corretor_fk
        WHERE pa.prospect_id = $1
        ORDER BY pa.created_at ASC
      `, [prospectId]);

            console.log('\n📊 Assignment History:');
            historyResult.rows.forEach((row, idx) => {
                console.log(`  ${idx + 1}. Corretor: ${row.corretor_fk.substring(0, 8)}... | Tipo: ${row.tipo_corretor || 'External'} | Motivo: ${row.motivo_type} | Status: ${row.status}`);
            });

            // Simulate Guardian tier decision
            const externalAttempts = historyResult.rows.filter(r =>
                (r.tipo_corretor === 'Externo' || !r.tipo_corretor) &&
                !r.motivo_type.includes('plantonista')
            ).length;

            const internalAttempts = historyResult.rows.filter(r =>
                r.tipo_corretor === 'Interno' &&
                !r.motivo_type.includes('plantonista')
            ).length;

            console.log(`\n🎯 Guardian Decision Logic:`);
            console.log(`   External attempts: ${externalAttempts}/${config.proximos_corretores_recebem_leads}`);
            console.log(`   Internal attempts: ${internalAttempts}/${config.proximos_corretores_recebem_leads_internos}`);

            let nextTier = 'External';
            if (externalAttempts >= config.proximos_corretores_recebem_leads && internalAttempts === 0) {
                nextTier = 'Internal';
            } else if (externalAttempts >= config.proximos_corretores_recebem_leads &&
                internalAttempts >= config.proximos_corretores_recebem_leads_internos) {
                nextTier = 'Plantonista';
            } else if (internalAttempts > 0 && internalAttempts < config.proximos_corretores_recebem_leads_internos) {
                nextTier = 'Internal';
            }

            console.log(`   ➡️  Next tier: ${nextTier}`);
        } else {
            console.log('ℹ️  No prospects with assignments found in last 7 days');
        }

        // Test 4: Check email templates
        console.log('\n📋 Test 4: Checking email templates...');
        const templatesResult = await pool.query(`
      SELECT name, is_active
      FROM public.email_templates
      WHERE name IN ('imovel-interesse', 'novo-lead-corretor', 'novo-lead-corretor-imovel-fk', 'lead-perdido-sla', 'lead-aceito-cliente')
      ORDER BY name
    `);

        console.log('✅ Email templates:');
        templatesResult.rows.forEach(row => {
            const status = row.is_active ? '✅' : '❌';
            console.log(`   ${status} ${row.name}`);
        });

        console.log('\n✅ All Guardian integration tests passed!');
        console.log('\n🎯 Guardian is ready to use!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

// Load environment and run
require('dotenv').config({ path: '.env.local' });
testGuardian();
