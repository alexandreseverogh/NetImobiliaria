const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Configuração do banco
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'Roberto@2007'
})

async function migrateData() {
  try {
    console.log('🔄 Iniciando migração de dados...')
    
    // Carregar dados do JSON
    const municipiosPath = path.join(__dirname, '../src/lib/admin/municipios.json')
    const municipiosData = JSON.parse(fs.readFileSync(municipiosPath, 'utf8'))
    
    // Criar mapeamento de códigos para nomes
    const estadoMap = new Map()
    const cidadeMap = new Map()
    
    municipiosData.estados.forEach((estado, estadoIndex) => {
      estadoMap.set(estadoIndex, estado.nome)
      
      estado.municipios.forEach((municipio, municipioIndex) => {
        cidadeMap.set(municipioIndex, municipio)
      })
    })
    
    console.log('📊 Mapeamentos criados:')
    console.log(`- Estados: ${estadoMap.size}`)
    console.log(`- Cidades: ${cidadeMap.size}`)
    
    // Migrar clientes
    console.log('👥 Migrando clientes...')
    const clientesResult = await pool.query('SELECT id, uuid, estado_fk, cidade_fk FROM clientes WHERE estado_nome IS NULL OR cidade_nome IS NULL')
    
    for (const cliente of clientesResult.rows) {
      const estadoNome = cliente.estado_fk !== null ? estadoMap.get(cliente.estado_fk) : null
      const cidadeNome = cliente.cidade_fk !== null ? cidadeMap.get(cliente.cidade_fk) : null
      
      const identifier = cliente.uuid || cliente.id
      const updateQuery = cliente.uuid
        ? 'UPDATE clientes SET estado_nome = $1, cidade_nome = $2 WHERE uuid = $3'
        : 'UPDATE clientes SET estado_nome = $1, cidade_nome = $2 WHERE id = $3'

      await pool.query(updateQuery, [estadoNome, cidadeNome, identifier])
    }
    
    console.log(`✅ ${clientesResult.rows.length} clientes migrados`)
    
    // Migrar proprietários
    console.log('🏠 Migrando proprietários...')
    const proprietariosResult = await pool.query('SELECT id, uuid, estado_fk, cidade_fk FROM proprietarios WHERE estado_nome IS NULL OR cidade_nome IS NULL')
    
    for (const proprietario of proprietariosResult.rows) {
      const estadoNome = proprietario.estado_fk !== null ? estadoMap.get(proprietario.estado_fk) : null
      const cidadeNome = proprietario.cidade_fk !== null ? cidadeMap.get(proprietario.cidade_fk) : null
      
      const identifier = proprietario.uuid || proprietario.id
      const updateQuery = proprietario.uuid
        ? 'UPDATE proprietarios SET estado_nome = $1, cidade_nome = $2 WHERE uuid = $3'
        : 'UPDATE proprietarios SET estado_nome = $1, cidade_nome = $2 WHERE id = $3'

      await pool.query(updateQuery, [estadoNome, cidadeNome, identifier])
    }
    
    console.log(`✅ ${proprietariosResult.rows.length} proprietários migrados`)
    
    console.log('🎉 Migração concluída com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro na migração:', error)
  } finally {
    await pool.end()
  }
}

migrateData()








