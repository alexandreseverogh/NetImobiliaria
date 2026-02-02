require('dotenv').config({ path: '.env.local' })
const { pool } = require('./utils/db.js')

async function investigarLeadEspecifico() {
  console.log('🔍 INVESTIGAÇÃO DETALHADA DE ROTEAMENTO DE LEADS\n')

  try {
    // 1. Pegar o último lead criado
    const ultimoLead = await pool.query(`
      SELECT 
        ip.id as prospect_id,
        i.id as imovel_id,
        i.codigo,
        i.titulo,
        i.corretor_fk,
        i.cidade_fk,
        i.estado_fk
      FROM imovel_prospects ip
      INNER JOIN imoveis i ON ip.id_imovel = i.id
      ORDER BY ip.created_at DESC
      LIMIT 1
    `)

    if (!ultimoLead.rows.length) {
      console.log('❌ Nenhum lead encontrado')
      return
    }

    const lead = ultimoLead.rows[0]
    console.log('📋 ÚLTIMO LEAD CRIADO:')
    console.log(`   Prospect ID: ${lead.prospect_id}`)
    console.log(`   Imóvel: ${lead.codigo} - ${lead.titulo}`)
    console.log(`   Localização: ${lead.cidade_fk}/${lead.estado_fk}`)
    console.log(`   Corretor FK: ${lead.corretor_fk || 'NULL (sem dono fixo)'}\n`)

    // 2. Ver histórico de atribuições desse lead
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

    console.log(`📊 HISTÓRICO DE ATRIBUIÇÕES (${atribuicoes.rows.length} tentativas):`)
    atribuicoes.rows.forEach((a, i) => {
      console.log(`\n   ${i + 1}. ${a.corretor_nome} (${a.tipo_corretor || 'NULL'})`)
      console.log(`      Status: ${a.status}`)
      console.log(`      Plantonista: ${a.is_plantonista ? 'SIM' : 'NÃO'}`)
      console.log(`      Criado em: ${a.created_at}`)
      console.log(`      Motivo: ${JSON.stringify(a.motivo, null, 2)}`)
    })

    // 3. Simular a query de pickNextBrokerByAreaExternal
    console.log('\n\n═══════════════════════════════════════════════════════════════')
    console.log('SIMULANDO pickNextBrokerByAreaExternal')
    console.log('═══════════════════════════════════════════════════════════════')

    const queryExternal = `
      SELECT
        u.id, u.nome, u.email, u.tipo_corretor,
        COUNT(a2.id) AS total_recebidos,
        MAX(a2.created_at) AS ultimo_recebimento,
        string_agg(DISTINCT caa.cidade_fk || '/' || caa.estado_fk, ', ') as areas
      FROM public.users u
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
      WHERE u.ativo = true
        AND ur.name = 'Corretor'
        AND COALESCE(u.is_plantonista, false) = false
        AND u.tipo_corretor = 'Externo'
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
        AND u.id NOT IN (
          SELECT corretor_fk FROM public.imovel_prospect_atribuicoes WHERE prospect_id = $3
        )
      GROUP BY u.id, u.nome, u.email, u.tipo_corretor
      ORDER BY COUNT(a2.id) ASC, MAX(a2.created_at) ASC NULLS FIRST, u.created_at ASC
    `

    const resultExternal = await pool.query(queryExternal, [lead.estado_fk, lead.cidade_fk, lead.prospect_id])

    console.log(`\n🔍 Corretores EXTERNOS elegíveis para ${lead.cidade_fk}/${lead.estado_fk}:`)
    console.log(`   Total encontrado: ${resultExternal.rows.length}\n`)

    if (resultExternal.rows.length === 0) {
      console.log('   ❌ NENHUM corretor externo encontrado!')
      console.log('\n   Possíveis razões:')
      console.log('   1. Nenhum corretor externo tem área cadastrada para essa cidade/estado')
      console.log('   2. Todos já receberam esse lead (estão no histórico)')
      console.log('   3. Todos estão inativos')
    } else {
      resultExternal.rows.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.nome}`)
        console.log(`      ID: ${c.id}`)
        console.log(`      Tipo: ${c.tipo_corretor || 'NULL'}`)
        console.log(`      Total recebidos: ${c.total_recebidos}`)
        console.log(`      Áreas: ${c.areas}`)
        console.log('      ---')
      })
    }

    // 4. Simular a query de pickInternalBrokerByArea
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('SIMULANDO pickInternalBrokerByArea')
    console.log('═══════════════════════════════════════════════════════════════')

    const queryInternal = `
      SELECT
        u.id, u.nome, u.email, u.tipo_corretor,
        COUNT(a2.id) AS total_recebidos,
        MAX(a2.created_at) AS ultimo_recebimento,
        string_agg(DISTINCT caa.cidade_fk || '/' || caa.estado_fk, ', ') as areas
      FROM public.users u
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      LEFT JOIN public.imovel_prospect_atribuicoes a2 ON a2.corretor_fk = u.id
      WHERE u.ativo = true
        AND ur.name = 'Corretor'
        AND COALESCE(u.is_plantonista, false) = false
        AND COALESCE(u.tipo_corretor, 'Externo') = 'Interno'
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
        AND u.id NOT IN (
          SELECT corretor_fk FROM public.imovel_prospect_atribuicoes WHERE prospect_id = $3
        )
      GROUP BY u.id, u.nome, u.email, u.tipo_corretor
      ORDER BY COUNT(a2.id) ASC, MAX(a2.created_at) ASC NULLS FIRST, u.created_at ASC
    `

    const resultInternal = await pool.query(queryInternal, [lead.estado_fk, lead.cidade_fk, lead.prospect_id])

    console.log(`\n🔍 Corretores INTERNOS elegíveis para ${lead.cidade_fk}/${lead.estado_fk}:`)
    console.log(`   Total encontrado: ${resultInternal.rows.length}\n`)

    if (resultInternal.rows.length === 0) {
      console.log('   ❌ NENHUM corretor interno encontrado!')
    } else {
      resultInternal.rows.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.nome}`)
        console.log(`      ID: ${c.id}`)
        console.log(`      Tipo: ${c.tipo_corretor}`)
        console.log(`      Total recebidos: ${c.total_recebidos}`)
        console.log(`      Áreas: ${c.areas}`)
        console.log('      ---')
      })
    }

    // 5. Verificar todos os corretores externos com área nessa cidade
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('TODOS OS CORRETORES EXTERNOS COM ÁREA NESSA LOCALIZAÇÃO')
    console.log('═══════════════════════════════════════════════════════════════')

    const todosExternos = await pool.query(`
      SELECT DISTINCT
        u.id, u.nome, u.ativo, u.tipo_corretor, u.is_plantonista
      FROM users u
      INNER JOIN user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN user_roles ur ON ura.role_id = ur.id
      INNER JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      WHERE ur.name = 'Corretor'
        AND u.tipo_corretor = 'Externo'
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
    `, [lead.estado_fk, lead.cidade_fk])

    console.log(`\nTotal: ${todosExternos.rows.length}`)
    todosExternos.rows.forEach((c, i) => {
      const jaRecebeu = atribuicoes.rows.some(a => a.corretor_fk === c.id)
      console.log(`\n${i + 1}. ${c.nome}`)
      console.log(`   Ativo: ${c.ativo ? 'SIM' : 'NÃO'}`)
      console.log(`   Plantonista: ${c.is_plantonista ? 'SIM' : 'NÃO'}`)
      console.log(`   Já recebeu este lead: ${jaRecebeu ? 'SIM' : 'NÃO'}`)
    })

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

investigarLeadEspecifico()
