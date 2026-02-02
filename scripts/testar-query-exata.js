require('dotenv').config({ path: '.env.local' })
const { pool } = require('./utils/db.js')

async function testarQueryExata() {
    console.log('🔍 TESTANDO QUERY EXATA DO WORKER\n')

    try {
        // 1. Pegar o último lead
        const ultimoLead = await pool.query(`
      SELECT 
        ip.id as prospect_id,
        i.cidade_fk,
        i.estado_fk
      FROM imovel_prospects ip
      INNER JOIN imoveis i ON ip.id_imovel = i.id
      ORDER BY ip.created_at DESC
      LIMIT 1
    `)

        const lead = ultimoLead.rows[0]
        console.log(`📋 Prospect ID: ${lead.prospect_id}`)
        console.log(`📍 Localização: ${lead.cidade_fk}/${lead.estado_fk}\n`)

        // 2. Executar a query EXATA do pickNextBrokerByAreaExternal
        console.log('🔍 Executando query EXATA do pickNextBrokerByAreaExternal:\n')

        const queryExata = `
      SELECT
        u.id, u.nome, u.email,
        COUNT(a2.id) AS total_recebidos,
        MAX(a2.created_at) AS ultimo_recebimento
      FROM public.users u
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
      WHERE u.ativo = true
        AND ur.name = 'Corretor'
        AND COALESCE(u.is_plantonista, false) = false
        AND (COALESCE(u.tipo_corretor, 'Externo') = 'Externo' OR u.tipo_corretor IS NULL)
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
        AND u.id NOT IN (
          SELECT corretor_fk FROM public.imovel_prospect_atribuicoes WHERE prospect_id = $3
        )
      GROUP BY u.id, u.nome, u.email
      ORDER BY COUNT(a2.id) ASC, MAX(a2.created_at) ASC NULLS FIRST, u.created_at ASC
      LIMIT 1
    `

        console.log('Parâmetros:')
        console.log(`  $1 (estado_fk): ${lead.estado_fk}`)
        console.log(`  $2 (cidade_fk): ${lead.cidade_fk}`)
        console.log(`  $3 (prospect_id): ${lead.prospect_id}\n`)

        const resultado = await pool.query(queryExata, [lead.estado_fk, lead.cidade_fk, lead.prospect_id])

        console.log(`📊 Resultado: ${resultado.rows.length} corretor(es) encontrado(s)\n`)

        if (resultado.rows.length === 0) {
            console.log('❌ QUERY RETORNOU VAZIO!\n')
            console.log('Vou testar removendo filtros um por um para identificar o problema...\n')

            // Teste 1: Sem o filtro NOT IN
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log('TESTE 1: Removendo filtro NOT IN')
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

            const querySemNotIn = `
        SELECT
          u.id, u.nome, u.email,
          COUNT(a2.id) AS total_recebidos,
          MAX(a2.created_at) AS ultimo_recebimento
        FROM public.users u
        INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
        INNER JOIN public.user_roles ur ON ura.role_id = ur.id
        INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
        LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
        WHERE u.ativo = true
          AND ur.name = 'Corretor'
          AND COALESCE(u.is_plantonista, false) = false
          AND (COALESCE(u.tipo_corretor, 'Externo') = 'Externo' OR u.tipo_corretor IS NULL)
          AND caa.estado_fk = $1
          AND caa.cidade_fk = $2
        GROUP BY u.id, u.nome, u.email
        ORDER BY COUNT(a2.id) ASC, MAX(a2.created_at) ASC NULLS FIRST, u.created_at ASC
      `

            const resSemNotIn = await pool.query(querySemNotIn, [lead.estado_fk, lead.cidade_fk])
            console.log(`Resultado: ${resSemNotIn.rows.length} corretor(es)\n`)

            if (resSemNotIn.rows.length > 0) {
                console.log('✅ SEM o filtro NOT IN, a query FUNCIONA!')
                console.log('🔍 Isso significa que o problema está no filtro NOT IN\n')

                resSemNotIn.rows.forEach((c, i) => {
                    console.log(`${i + 1}. ${c.nome} (${c.id})`)
                    console.log(`   Total recebidos: ${c.total_recebidos}`)
                })
            }

        } else {
            console.log('✅ QUERY FUNCIONOU!')
            resultado.rows.forEach((c, i) => {
                console.log(`${i + 1}. ${c.nome}`)
                console.log(`   ID: ${c.id}`)
                console.log(`   Total recebidos: ${c.total_recebidos}`)
            })
        }

    } catch (error) {
        console.error('❌ Erro:', error.message)
        console.error(error.stack)
    } finally {
        await pool.end()
    }
}

testarQueryExata()
