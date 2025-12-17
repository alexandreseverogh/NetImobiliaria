const { Pool } = require('pg')

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'net_imobiliaria_tokenizacao',
  password: 'Roberto@2007',
  port: 5432,
})

async function insertSampleData() {
  const client = await pool.connect()
  
  try {
    console.log('🚀 Inserindo dados de exemplo...')

    // Inserir usuário de exemplo
    const userResult = await client.query(`
      INSERT INTO users (username, email, nome, senha_hash) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO UPDATE SET 
        username = EXCLUDED.username,
        nome = EXCLUDED.nome
      RETURNING id
    `, ['joao.silva', 'joao.silva@email.com', 'João Silva', '$2b$10$example.hash'])

    const userId = userResult.rows[0].id
    console.log('✅ Usuário criado:', userId)

    // Inserir imóveis de exemplo
    const imoveis = [
      {
        titulo: 'Apartamento Premium Copacabana',
        descricao: 'Apartamento de 3 dormitórios com vista para o mar em Copacabana. Localizado em prédio de alto padrão com portaria 24h, academia, piscina e salão de festas.',
        valor: 2500000.00,
        endereco: 'Av. Atlântica, 1234 - Copacabana, Rio de Janeiro - RJ'
      },
      {
        titulo: 'Cobertura Vista Mar Ipanema',
        descricao: 'Cobertura duplex com vista panorâmica para o mar. 4 dormitórios, 3 banheiros, varanda gourmet, home theater e área de lazer completa.',
        valor: 4500000.00,
        endereco: 'Rua Visconde de Pirajá, 567 - Ipanema, Rio de Janeiro - RJ'
      },
      {
        titulo: 'Loft Industrial Vila Madalena',
        descricao: 'Loft moderno em prédio histórico reformado. 2 ambientes integrados, pé-direito alto, design industrial e localização privilegiada.',
        valor: 1200000.00,
        endereco: 'Rua Harmonia, 890 - Vila Madalena, São Paulo - SP'
      }
    ]

    const imoveisIds = []
    for (const imovel of imoveis) {
      const result = await client.query(`
        INSERT INTO imoveis (titulo, descricao, valor, endereco) 
        VALUES ($1, $2, $3, $4) 
        RETURNING id
      `, [imovel.titulo, imovel.descricao, imovel.valor, imovel.endereco])
      
      imoveisIds.push(result.rows[0].id)
      console.log('✅ Imóvel criado:', imovel.titulo)
    }

    // Inserir tokens
    const tokens = [
      {
        imovel_id: imoveisIds[0],
        token_symbol: 'NETHOUSE01',
        token_name: 'NetHouse Copacabana Token',
        total_supply: 4000,
        token_price: 1200.00,
        valor_total_imovel: 2500000.00,
        percentual_liquidez: 100.00,
        status: 'ACTIVE'
      },
      {
        imovel_id: imoveisIds[1],
        token_symbol: 'NETHOUSE02',
        token_name: 'NetHouse Ipanema Token',
        total_supply: 3000,
        token_price: 2800.00,
        valor_total_imovel: 4500000.00,
        percentual_liquidez: 100.00,
        status: 'ACTIVE'
      },
      {
        imovel_id: imoveisIds[2],
        token_symbol: 'NETHOUSE03',
        token_name: 'NetHouse Vila Madalena Token',
        total_supply: 3000,
        token_price: 850.00,
        valor_total_imovel: 1200000.00,
        percentual_liquidez: 100.00,
        status: 'ACTIVE'
      }
    ]

    const tokensIds = []
    for (const token of tokens) {
      const result = await client.query(`
        INSERT INTO tokens (
          imovel_id, token_symbol, token_name, total_supply, 
          token_price, valor_total_imovel, percentual_liquidez, status, data_tokenizacao
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id
      `, [
        token.imovel_id, token.token_symbol, token.token_name, token.total_supply,
        token.token_price, token.valor_total_imovel, token.percentual_liquidez, 
        token.status, new Date()
      ])
      
      tokensIds.push(result.rows[0].id)
      console.log('✅ Token criado:', token.token_symbol)
    }

    // Inserir investidor
    const investorResult = await client.query(`
      INSERT INTO investidores (
        user_id, wallet_address, kyc_status, compliance_score, 
        limite_investimento, data_aprovacao_kyc
      ) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING id
    `, [
      userId, 
      '0x742d35Cc6634C0532925a3b8D', 
      'APPROVED', 
      85, 
      1000000.00, 
      new Date()
    ])

    const investorId = investorResult.rows[0].id
    console.log('✅ Investidor criado:', investorId)

    // Inserir algumas carteiras (investimentos)
    const carteiras = [
      {
        investidor_id: investorId,
        token_id: tokensIds[0],
        quantidade: 100,
        valor_medio: 1200.00,
        valor_atual: 1250.00
      },
      {
        investidor_id: investorId,
        token_id: tokensIds[1],
        quantidade: 50,
        valor_medio: 2800.00,
        valor_atual: 2900.00
      }
    ]

    for (const carteira of carteiras) {
      await client.query(`
        INSERT INTO carteiras (investidor_id, token_id, quantidade, valor_medio, valor_atual) 
        VALUES ($1, $2, $3, $4, $5)
      `, [carteira.investidor_id, carteira.token_id, carteira.quantidade, carteira.valor_medio, carteira.valor_atual])
      
      console.log('✅ Carteira criada para token:', carteira.token_id)
    }

    // Inserir algumas transações
    const transacoes = [
      {
        token_id: tokensIds[0],
        investidor_id: investorId,
        tipo: 'BUY',
        quantidade: 100,
        preco_unitario: 1200.00,
        valor_total: 120000.00,
        taxa_plataforma: 120.00,
        status: 'CONFIRMED'
      },
      {
        token_id: tokensIds[1],
        investidor_id: investorId,
        tipo: 'BUY',
        quantidade: 50,
        preco_unitario: 2800.00,
        valor_total: 140000.00,
        taxa_plataforma: 140.00,
        status: 'CONFIRMED'
      }
    ]

    for (const transacao of transacoes) {
      await client.query(`
        INSERT INTO transacoes (
          token_id, investidor_id, tipo, quantidade, preco_unitario, 
          valor_total, taxa_plataforma, status, data_confirmacao
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        transacao.token_id, transacao.investidor_id, transacao.tipo, transacao.quantidade,
        transacao.preco_unitario, transacao.valor_total, transacao.taxa_plataforma,
        transacao.status, new Date()
      ])
      
      console.log('✅ Transação criada para token:', transacao.token_id)
    }

    // Inserir algumas receitas
    const receitas = [
      {
        tipo: 'TOKENIZACAO',
        token_id: tokensIds[0],
        investidor_id: investorId,
        valor: 3000.00,
        percentual: 2.5,
        periodo: 'ONE_TIME',
        status: 'COLLECTED'
      },
      {
        tipo: 'GESTAO',
        token_id: tokensIds[0],
        valor: 2500.00,
        percentual: 1.0,
        periodo: 'MONTHLY',
        status: 'COLLECTED'
      }
    ]

    for (const receita of receitas) {
      await client.query(`
        INSERT INTO receitas (
          tipo, token_id, investidor_id, valor, percentual, periodo, status, data_coleta
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        receita.tipo, receita.token_id, receita.investidor_id, receita.valor,
        receita.percentual, receita.periodo, receita.status, new Date()
      ])
      
      console.log('✅ Receita criada:', receita.tipo)
    }

    console.log('\n🎉 Dados de exemplo inseridos com sucesso!')
    console.log('\n📊 Resumo:')
    console.log(`- ${imoveis.length} imóveis criados`)
    console.log(`- ${tokens.length} tokens criados`)
    console.log(`- 1 investidor criado`)
    console.log(`- ${carteiras.length} carteiras criadas`)
    console.log(`- ${transacoes.length} transações criadas`)
    console.log(`- ${receitas.length} receitas criadas`)

  } catch (error) {
    console.error('❌ Erro ao inserir dados:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

insertSampleData()

