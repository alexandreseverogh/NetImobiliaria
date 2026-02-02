require('dotenv').config({ path: '.env.local' })
const { pool } = require('./utils/db.js')

async function verificarPorQueNaoRetorna() {
    console.log('🔍 VERIFICANDO POR QUE QUERY NÃO RETORNA EXTERNOS\n')

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

        // 2. Listar TODOS os externos com área nessa localização
        const todosExternos = await pool.query(`
      SELECT DISTINCT
        u.id, u.nome, u.tipo_corretor, u.is_plantonista, u.ativo
      FROM users u
      INNER JOIN user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN user_roles ur ON ura.role_id = ur.id
      INNER JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      WHERE ur.name = 'Corretor'
        AND (COALESCE(u.tipo_corretor, 'Externo') = 'Externo' OR u.tipo_corretor IS NULL)
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
    `, [lead.estado_fk, lead.cidade_fk])

        console.log(`📊 Total de corretores EXTERNOS com área em ${lead.cidade_fk}/${lead.estado_fk}: ${todosExternos.rows.length}\n`)

        // 3. Para cada um, verificar se passa em TODOS os filtros
        for (const corretor of todosExternos.rows) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            console.log(`Corretor: ${corretor.nome}`)
            console.log(`ID: ${corretor.id}`)
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

            // Verificar cada filtro individualmente
            console.log(`\n✓ Filtros básicos:`)
            console.log(`   ativo = true: ${corretor.ativo ? '✅ PASSA' : '❌ FALHA'}`)
            console.log(`   is_plantonista = false: ${!corretor.is_plantonista ? '✅ PASSA' : '❌ FALHA'}`)
            console.log(`   tipo_corretor = Externo (ou NULL): ${(corretor.tipo_corretor === 'Externo' || corretor.tipo_corretor === null) ? '✅ PASSA' : '❌ FALHA'}`)

            // Verificar se já recebeu este lead
            const jaRecebeu = await pool.query(`
        SELECT id, status, created_at
        FROM imovel_prospect_atribuicoes
        WHERE prospect_id = $1 AND corretor_fk = $2
      `, [lead.prospect_id, corretor.id])

            console.log(`\n✓ Filtro NOT IN (já recebeu este lead):`)
            if (jaRecebeu.rows.length === 0) {
                console.log(`   ✅ PASSA - Nunca recebeu este lead`)
            } else {
                console.log(`   ❌ FALHA - Já recebeu este lead ${jaRecebeu.rows.length} vez(es):`)
                jaRecebeu.rows.forEach((a, i) => {
                    console.log(`      ${i + 1}. Status: ${a.status}, Criado em: ${a.created_at}`)
                })
            }

            // Verificar se tem área cadastrada
            const areas = await pool.query(`
        SELECT estado_fk, cidade_fk
        FROM corretor_areas_atuacao
        WHERE corretor_fk = $1
      `, [corretor.id])

            console.log(`\n✓ Áreas cadastradas: ${areas.rows.length}`)
            areas.rows.forEach(a => {
                const match = a.estado_fk === lead.estado_fk && a.cidade_fk === lead.cidade_fk
                console.log(`   ${match ? '✅' : '  '} ${a.cidade_fk}/${a.estado_fk}`)
            })

            // CONCLUSÃO
            const passaTodos = corretor.ativo &&
                !corretor.is_plantonista &&
                (corretor.tipo_corretor === 'Externo' || corretor.tipo_corretor === null) &&
                jaRecebeu.rows.length === 0 &&
                areas.rows.some(a => a.estado_fk === lead.estado_fk && a.cidade_fk === lead.cidade_fk)

            console.log(`\n${passaTodos ? '✅ DEVERIA SER SELECIONADO' : '❌ NÃO DEVERIA SER SELECIONADO'}`)
        }

    } catch (error) {
        console.error('❌ Erro:', error.message)
        console.error(error.stack)
    } finally {
        await pool.end()
    }
}

verificarPorQueNaoRetorna()
