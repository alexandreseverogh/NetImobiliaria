require('dotenv').config({ path: '.env.local' })
const { pool } = require('./utils/db.js')

async function diagnosticarCorretores() {
    console.log('🔍 DIAGNÓSTICO DE CORRETORES\n')

    try {
        // 1. Listar todos os corretores
        const corretores = await pool.query(`
      SELECT 
        u.id, 
        u.nome, 
        u.email,
        u.tipo_corretor, 
        u.is_plantonista, 
        u.ativo,
        COUNT(DISTINCT caa.id) as areas_cadastradas
      FROM users u
      INNER JOIN user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN user_roles ur ON ura.role_id = ur.id
      LEFT JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      WHERE ur.name = 'Corretor'
      GROUP BY u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista, u.ativo
      ORDER BY u.tipo_corretor NULLS FIRST, u.is_plantonista, u.nome
    `)

        console.log(`📊 Total de corretores: ${corretores.rows.length}\n`)

        const externos = corretores.rows.filter(c => c.tipo_corretor === 'Externo' || c.tipo_corretor === null)
        const internos = corretores.rows.filter(c => c.tipo_corretor === 'Interno')
        const plantonistas = corretores.rows.filter(c => c.is_plantonista === true)

        console.log(`📈 Externos: ${externos.length}`)
        console.log(`📈 Internos: ${internos.length}`)
        console.log(`📈 Plantonistas: ${plantonistas.length}\n`)

        console.log('═══════════════════════════════════════════════════════════════')
        console.log('CORRETORES EXTERNOS (ou tipo_corretor = NULL)')
        console.log('═══════════════════════════════════════════════════════════════')
        externos.forEach(c => {
            console.log(`ID: ${c.id}`)
            console.log(`Nome: ${c.nome}`)
            console.log(`Tipo: ${c.tipo_corretor || 'NULL'}`)
            console.log(`Plantonista: ${c.is_plantonista ? 'SIM' : 'NÃO'}`)
            console.log(`Ativo: ${c.ativo ? 'SIM' : 'NÃO'}`)
            console.log(`Áreas cadastradas: ${c.areas_cadastradas}`)
            console.log('---')
        })

        console.log('\n═══════════════════════════════════════════════════════════════')
        console.log('CORRETORES INTERNOS')
        console.log('═══════════════════════════════════════════════════════════════')
        internos.forEach(c => {
            console.log(`ID: ${c.id}`)
            console.log(`Nome: ${c.nome}`)
            console.log(`Tipo: ${c.tipo_corretor}`)
            console.log(`Plantonista: ${c.is_plantonista ? 'SIM' : 'NÃO'}`)
            console.log(`Ativo: ${c.ativo ? 'SIM' : 'NÃO'}`)
            console.log(`Áreas cadastradas: ${c.areas_cadastradas}`)
            console.log('---')
        })

        // 2. Verificar áreas de atuação
        console.log('\n═══════════════════════════════════════════════════════════════')
        console.log('ÁREAS DE ATUAÇÃO POR CORRETOR')
        console.log('═══════════════════════════════════════════════════════════════')

        const areas = await pool.query(`
      SELECT 
        u.nome as corretor_nome,
        u.tipo_corretor,
        caa.estado_fk,
        caa.cidade_fk
      FROM corretor_areas_atuacao caa
      INNER JOIN users u ON u.id = caa.corretor_fk
      ORDER BY u.tipo_corretor NULLS FIRST, u.nome, caa.estado_fk, caa.cidade_fk
    `)

        areas.rows.forEach(a => {
            console.log(`${a.corretor_nome} (${a.tipo_corretor || 'NULL'}): ${a.cidade_fk}/${a.estado_fk}`)
        })

    } catch (error) {
        console.error('❌ Erro:', error.message)
    } finally {
        await pool.end()
    }
}

diagnosticarCorretores()
