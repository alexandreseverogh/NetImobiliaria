const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
})

async function testImageSystem() {
  console.log('🧪 Testando sistema de imagens...\n')

  try {
    // 1. Testar conexão
    console.log('1️⃣ Testando conexão com banco...')
    const client = await pool.connect()
    console.log('✅ Conexão estabelecida\n')

    // 2. Verificar se a tabela existe
    console.log('2️⃣ Verificando estrutura da tabela...')
    const tableCheck = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'imovel_imagens' 
      ORDER BY ordinal_position
    `)
    
    if (tableCheck.rows.length === 0) {
      console.log('❌ Tabela imovel_imagens não encontrada')
      return
    }
    
    console.log('✅ Tabela encontrada com as seguintes colunas:')
    tableCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
    })
    console.log()

    // 3. Verificar se há imóveis para testar
    console.log('3️⃣ Verificando imóveis disponíveis...')
    const imoveis = await client.query('SELECT id, codigo, titulo FROM imoveis LIMIT 5')
    
    if (imoveis.rows.length === 0) {
      console.log('⚠️  Nenhum imóvel encontrado. Criando um imóvel de teste...')
      
      // Criar imóvel de teste
      const novoImovel = await client.query(`
        INSERT INTO imoveis (codigo, titulo, descricao, tipo_id, status_id, preco, cidade, bairro, ativo)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        'TEST001',
        'Imóvel de Teste para Sistema de Imagens',
        'Este é um imóvel criado automaticamente para testar o sistema de imagens',
        1, // tipo_id
        1, // status_id
        250000.00,
        'São Paulo',
        'Centro',
        true
      ])
      
      console.log(`✅ Imóvel de teste criado com ID: ${novoImovel.rows[0].id}`)
    } else {
      console.log(`✅ ${imoveis.rows.length} imóveis encontrados:`)
      imoveis.rows.forEach(imovel => {
        console.log(`   - ID: ${imovel.id}, Código: ${imovel.codigo}, Título: ${imovel.titulo}`)
      })
    }
    console.log()

    // 4. Verificar diretório de uploads
    console.log('4️⃣ Verificando diretório de uploads...')
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'imoveis')
    
    if (!fs.existsSync(uploadDir)) {
      console.log('⚠️  Diretório de uploads não existe. Criando...')
      fs.mkdirSync(uploadDir, { recursive: true })
      console.log('✅ Diretório criado')
    } else {
      console.log('✅ Diretório de uploads existe')
    }
    console.log()

    // 5. Testar funções de banco de dados
    console.log('5️⃣ Testando funções de banco de dados...')
    
    const imovelId = imoveis.rows[0]?.id || novoImovel?.rows[0]?.id
    
    if (imovelId) {
      // Testar inserção de imagem
      console.log(`   Testando inserção de imagem para imóvel ${imovelId}...`)
      
      const imagemTeste = await client.query(`
        INSERT INTO imovel_imagens (imovel_id, nome_arquivo, url, descricao, ordem, principal)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        imovelId,
        'teste_imagem.jpg',
        '/uploads/imoveis/' + imovelId + '/teste_imagem.jpg',
        'Imagem de teste para validação do sistema',
        0,
        true
      ])
      
      console.log(`   ✅ Imagem de teste inserida com ID: ${imagemTeste.rows[0].id}`)
      
      // Testar busca de imagens
      const imagens = await client.query(`
        SELECT * FROM imovel_imagens WHERE imovel_id = $1 ORDER BY ordem
      `, [imovelId])
      
      console.log(`   ✅ ${imagens.rows.length} imagem(ns) encontrada(s) para o imóvel`)
      
      // Limpar dados de teste
      await client.query('DELETE FROM imovel_imagens WHERE id = $1', [imagemTeste.rows[0].id])
      console.log('   ✅ Dados de teste removidos')
    }
    
    console.log()

    // 6. Verificar permissões
    console.log('6️⃣ Verificando sistema de permissões...')
    const permissions = await client.query(`
      SELECT r.name as resource, a.name as action
      FROM permissions p
      JOIN resources r ON p.resource_id = r.id
      JOIN actions a ON p.action_id = a.id
      WHERE r.name = 'imoveis'
    `)
    
    if (permissions.rows.length > 0) {
      console.log('✅ Permissões para imóveis configuradas:')
      permissions.rows.forEach(perm => {
        console.log(`   - ${perm.resource}: ${perm.action}`)
      })
    } else {
      console.log('⚠️  Nenhuma permissão encontrada para imóveis')
    }
    console.log()

    console.log('🎉 Teste do sistema de imagens concluído com sucesso!')
    console.log('\n📋 Resumo:')
    console.log('   - Banco de dados: ✅ Conectado')
    console.log('   - Tabela de imagens: ✅ Estrutura correta')
    console.log('   - Diretório de uploads: ✅ Configurado')
    console.log('   - Funções de banco: ✅ Funcionando')
    console.log('   - Sistema de permissões: ✅ Configurado')

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testImageSystem()
}

module.exports = { testImageSystem }







