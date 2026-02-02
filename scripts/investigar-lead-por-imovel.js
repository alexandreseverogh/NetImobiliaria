require('dotenv').config({ path: '.env.local' })
const { pool } = require('./utils/db.js')

async function investigarLeadPorImovel(imovelId) {
    console.log(`🔍 INVESTIGANDO LEAD DO IMÓVEL ${imovelId}\n`)

    try {
        // 1. Buscar o lead mais recente desse imóvel
        const leadQuery = await pool.query(`
      SELECT 
        ip.id as prospect_id,
        i.id as imovel_id,
        i.codigo,
        i.titulo,
        i.corretor_fk,
        i.cidade_fk,
        i.estado_fk,
        ip.created_at
      FROM imovel_prospects ip
      INNER JOIN imoveis i ON ip.id_imovel = i.id
      WHERE i.id = $1
      ORDER BY ip.created_at DESC
      LIMIT 1
    `, [imovelId])

        if (!leadQuery.rows.length) {
            console.log(`❌ Nenhum lead encontrado para o imóvel ${imovelId}`)
            return
        }

        const lead = leadQuery.rows[0]
        console.log(`📋 LEAD ENCONTRADO:`)
        console.log(`   Prospect ID: ${lead.prospect_id}`)
        console.log(`   Imóvel: ${lead.codigo} - ${lead.titulo}`)
        console.log(`   Localização: ${lead.cidade_fk}/${lead.estado_fk}`)
        console.log(`   Corretor FK: ${lead.corretor_fk || 'NULL (sem dono fixo)'}`)
        console.log(`   Criado em: ${lead.created_at}\n`)

        // 2. Histórico de atribuições
        const atribuicoes = await pool.query(`
      SELECT 
        a.id,
        a.status,
        a.created_at,
        a.motivo,
        u.nome as corretor_nome,
        u.tipo_corretor,
        u.is_plantonista
      FROM imovel_prospect_atribuicoes a
      INNER JOIN users u ON u.id = a.corretor_fk
      WHERE a.prospect_id = $1
      ORDER BY a.created_at ASC
    `, [lead.prospect_id])

        console.log(`📊 HISTÓRICO DE ATRIBUIÇÕES (${atribuicoes.rows.length} tentativas):\n`)
        atribuicoes.rows.forEach((a, i) => {
            console.log(`   ${i + 1}. ${a.corretor_nome} (${a.tipo_corretor || 'NULL'})`)
            console.log(`      Status: ${a.status}`)
            console.log(`      Plantonista: ${a.is_plantonista ? 'SIM' : 'NÃO'}`)
            console.log(`      Criado em: ${a.created_at}`)
            console.log(`      Motivo: ${JSON.stringify(a.motivo, null, 2)}`)
            console.log('')
        })

        // 3. Verificar corretores externos disponíveis
        console.log('\n═══════════════════════════════════════════════════════════════')
        console.log('CORRETORES EXTERNOS DISPONÍVEIS PARA ESSA LOCALIZAÇÃO')
        console.log('═══════════════════════════════════════════════════════════════\n')

        const externosDisponiveis = await pool.query(`
      SELECT
        u.id, u.nome, u.email, u.tipo_corretor,
        COUNT(a2.id) AS total_recebidos
      FROM public.users u
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
      WHERE u.ativo = true
        AND ur.name = 'Corretor'
        AND COALESCE(u.is_plantonista, false) = false
        AND (u.tipo_corretor = 'Externo' OR u.tipo_corretor IS NULL)
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
        AND u.id NOT IN (
          SELECT corretor_fk FROM public.imovel_prospect_atribuicoes WHERE prospect_id = $3
        )
      GROUP BY u.id, u.nome, u.email, u.tipo_corretor
      ORDER BY COUNT(a2.id) ASC
    `, [lead.estado_fk, lead.cidade_fk, lead.prospect_id])

        console.log(`Total: ${externosDisponiveis.rows.length}\n`)

        if (externosDisponiveis.rows.length === 0) {
            console.log('❌ NENHUM corretor externo disponível!')
            console.log('\nPossíveis razões:')
            console.log('1. Todos já receberam este lead')
            console.log('2. Nenhum tem área cadastrada para essa localização')
            console.log('3. Todos estão inativos')
        } else {
            externosDisponiveis.rows.forEach((c, i) => {
                console.log(`${i + 1}. ${c.nome}`)
                console.log(`   ID: ${c.id}`)
                console.log(`   Tipo: ${c.tipo_corretor || 'NULL'}`)
                console.log(`   Total recebidos: ${c.total_recebidos}`)
                console.log('   ---')
            })
        }

    } catch (error) {
        console.error('❌ Erro:', error.message)
        console.error(error.stack)
    } finally {
        await pool.end()
    }
}

const imovelId = process.argv[2] || 145
investigarLeadPorImovel(parseInt(imovelId))
