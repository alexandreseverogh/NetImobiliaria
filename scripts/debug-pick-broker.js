/**
 * Debug - Testa função pickBrokerByArea
 */

const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function testPickBrokerByArea() {
    try {
        console.log('🔍 Testando pickBrokerByArea para PE/Recife...\n');

        // Query EXATA da função pickBrokerByArea
        const q = `
      SELECT
        u.id, u.nome, u.email,
        COALESCE(cs.nivel, 0) as nivel,
        COALESCE(cs.xp_total, 0) as xp,
        COUNT(a.id) AS total_recebidos,
        MAX(a.created_at) AS ultimo_recebimento
      FROM public.users u
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
      LEFT JOIN public.imovel_prospect_atribuicoes a ON a.corretor_fk = u.id
      WHERE u.ativo = true
        AND ur.name = 'Corretor'
        AND COALESCE(u.is_plantonista, false) = false
        AND COALESCE(u.tipo_corretor, 'Externo') = 'Externo'
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
        AND (CASE WHEN array_length($3::uuid[], 1) > 0 THEN u.id != ALL($3::uuid[]) ELSE true END)
      GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
      ORDER BY 
        COALESCE(cs.nivel, 0) DESC,
        COALESCE(cs.xp_total, 0) DESC,
        COUNT(a.id) ASC, 
        MAX(a.created_at) ASC NULLS FIRST, 
        u.created_at ASC
      LIMIT 1
    `;

        const result = await pool.query(q, ['PE', 'Recife', []]);

        console.log(`Resultado: ${result.rows.length} corretor(es) encontrado(s)\n`);

        if (result.rows.length > 0) {
            const row = result.rows[0];
            console.log('✅ Corretor selecionado:');
            console.log(`   ID: ${row.id}`);
            console.log(`   Nome: ${row.nome}`);
            console.log(`   Email: ${row.email}`);
            console.log(`   Nível: ${row.nivel}`);
            console.log(`   XP: ${row.xp}`);
            console.log(`   Total recebidos: ${row.total_recebidos}`);
            console.log(`   Último recebimento: ${row.ultimo_recebimento || 'Nunca'}`);
        } else {
            console.log('❌ Nenhum corretor External encontrado para PE/Recife');
            console.log('\nVerificando por que...\n');

            // Debug: Verificar cada condição
            const debugQueries = [
                { name: 'Corretores ativos', query: "SELECT COUNT(*) FROM users WHERE ativo = true" },
                { name: 'Com role Corretor', query: "SELECT COUNT(*) FROM users u JOIN user_role_assignments ura ON ura.user_id = u.id JOIN user_roles ur ON ur.id = ura.role_id WHERE u.ativo = true AND ur.name = 'Corretor'" },
                { name: 'Não plantonistas', query: "SELECT COUNT(*) FROM users u JOIN user_role_assignments ura ON ura.user_id = u.id JOIN user_roles ur ON ur.id = ura.role_id WHERE u.ativo = true AND ur.name = 'Corretor' AND COALESCE(u.is_plantonista, false) = false" },
                { name: 'Tipo External', query: "SELECT COUNT(*) FROM users u JOIN user_role_assignments ura ON ura.user_id = u.id JOIN user_roles ur ON ur.id = ura.role_id WHERE u.ativo = true AND ur.name = 'Corretor' AND COALESCE(u.is_plantonista, false) = false AND COALESCE(u.tipo_corretor, 'Externo') = 'Externo'" },
                { name: 'Com área PE/Recife', query: "SELECT COUNT(*) FROM users u JOIN user_role_assignments ura ON ura.user_id = u.id JOIN user_roles ur ON ur.id = ura.role_id JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id WHERE u.ativo = true AND ur.name = 'Corretor' AND COALESCE(u.is_plantonista, false) = false AND COALESCE(u.tipo_corretor, 'Externo') = 'Externo' AND caa.estado_fk = 'PE' AND caa.cidade_fk = 'Recife'" }
            ];

            for (const dq of debugQueries) {
                const dr = await pool.query(dq.query);
                console.log(`   ${dq.name}: ${dr.rows[0].count}`);
            }
        }

        await pool.end();

    } catch (error) {
        console.error('❌ Erro:', error.message);
        await pool.end();
    }
}

testPickBrokerByArea();
