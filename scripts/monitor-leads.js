/**
 * Monitor de Leads - CORRIGIDO com schema real
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function monitorLeads() {
    try {
        console.log('📊 Monitor de Leads - Atualizado a cada 5 segundos\n');
        console.log('='.repeat(80));

        // Leads ativos (JOIN com users para pegar nome e email do cliente)
        const activeResult = await pool.query(`
      SELECT 
        ip.id,
        u.nome as cliente_nome,
        u.email as cliente_email,
        COUNT(CASE WHEN pa.status = 'atribuido' THEN 1 END) as atribuidos,
        COUNT(CASE WHEN pa.status = 'aceito' THEN 1 END) as aceitos,
        COUNT(CASE WHEN pa.status = 'expirado' THEN 1 END) as expirados,
        COUNT(pa.id) as total_atribuicoes
      FROM imovel_prospects ip
      LEFT JOIN users u ON u.id = ip.id_cliente
      LEFT JOIN imovel_prospect_atribuicoes pa ON pa.prospect_id = ip.id
      WHERE ip.created_at >= NOW() - INTERVAL '1 hour'
      GROUP BY ip.id, u.nome, u.email
      ORDER BY ip.created_at DESC
      LIMIT 10
    `);

        console.log(`\n📋 Leads da última hora (${activeResult.rows.length}):`);
        if (activeResult.rows.length === 0) {
            console.log('   Nenhum lead encontrado');
        } else {
            activeResult.rows.forEach(row => {
                console.log(`\n   Lead #${row.id}: ${row.cliente_nome || 'N/A'}`);
                console.log(`   Email: ${row.cliente_email || 'N/A'}`);
                console.log(`   Atribuições: ${row.total_atribuicoes} (${row.atribuidos} atribuídos, ${row.aceitos} aceitos, ${row.expirados} expirados)`);
            });
        }

        // Atribuições que vão expirar em breve
        const expiringResult = await pool.query(`
      SELECT 
        pa.id,
        pa.prospect_id,
        uc.nome as cliente_nome,
        ucor.nome as corretor_nome,
        ucor.tipo_corretor,
        pa.status,
        pa.expira_em,
        EXTRACT(EPOCH FROM (pa.expira_em - NOW())) / 60 as minutos_restantes,
        pa.motivo->>'type' as motivo_type
      FROM imovel_prospect_atribuicoes pa
      JOIN imovel_prospects ip ON ip.id = pa.prospect_id
      LEFT JOIN users uc ON uc.id = ip.id_cliente
      JOIN users ucor ON ucor.id = pa.corretor_fk
      WHERE pa.status = 'atribuido'
        AND pa.expira_em IS NOT NULL
        AND pa.expira_em > NOW()
        AND pa.expira_em <= NOW() + INTERVAL '10 minutes'
      ORDER BY pa.expira_em ASC
      LIMIT 5
    `);

        console.log(`\n\n⏰ Atribuições expirando em breve (${expiringResult.rows.length}):`);
        if (expiringResult.rows.length === 0) {
            console.log('   Nenhuma atribuição próxima de expirar');
        } else {
            expiringResult.rows.forEach(row => {
                const mins = Math.floor(row.minutos_restantes);
                console.log(`\n   Atribuição #${row.id} - Lead: ${row.cliente_nome || 'N/A'}`);
                console.log(`   Corretor: ${row.corretor_nome} (${row.tipo_corretor || 'External'})`);
                console.log(`   Expira em: ${mins} minutos`);
                console.log(`   Motivo: ${row.motivo_type}`);
            });
        }

        // Atribuições já expiradas
        const expiredResult = await pool.query(`
      SELECT 
        pa.id,
        pa.prospect_id,
        uc.nome as cliente_nome,
        ucor.nome as corretor_nome,
        ucor.tipo_corretor,
        pa.expira_em,
        EXTRACT(EPOCH FROM (NOW() - pa.expira_em)) / 60 as minutos_expirado,
        pa.motivo->>'type' as motivo_type
      FROM imovel_prospect_atribuicoes pa
      JOIN imovel_prospects ip ON ip.id = pa.prospect_id
      LEFT JOIN users uc ON uc.id = ip.id_cliente
      JOIN users ucor ON ucor.id = pa.corretor_fk
      WHERE pa.status = 'atribuido'
        AND pa.expira_em IS NOT NULL
        AND pa.expira_em <= NOW()
        AND COALESCE(pa.motivo->>'type', '') <> 'imovel_corretor_fk'
      ORDER BY pa.expira_em DESC
      LIMIT 5
    `);

        console.log(`\n\n🔴 Atribuições EXPIRADAS aguardando processamento (${expiredResult.rows.length}):`);
        if (expiredResult.rows.length === 0) {
            console.log('   Nenhuma atribuição expirada pendente');
        } else {
            expiredResult.rows.forEach(row => {
                const mins = Math.floor(row.minutos_expirado);
                console.log(`\n   ⚠️  Atribuição #${row.id} - Lead: ${row.cliente_nome || 'N/A'}`);
                console.log(`   Corretor: ${row.corretor_nome} (${row.tipo_corretor || 'External'})`);
                console.log(`   Expirou há: ${mins} minutos`);
                console.log(`   Motivo: ${row.motivo_type}`);
            });
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n💡 Dica: Gere um lead pela UI e acompanhe aqui!\n');

    } catch (error) {
        console.error('❌ Erro:', error.message);
    }
}

// Executar uma vez
monitorLeads().then(() => {
    console.log('🔄 Atualizando a cada 5 segundos... (Ctrl+C para parar)\n');

    // Atualizar a cada 5 segundos
    setInterval(async () => {
        console.clear();
        await monitorLeads();
    }, 5000);
});
