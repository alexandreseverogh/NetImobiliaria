import { Pool, PoolConfig } from 'pg'

const dbPassword = process.env.DB_PASSWORD
if (!dbPassword) {
  // Evita hardcoding e torna o problema explícito em ambientes sem configuração.
  console.warn('⚠️ DB_PASSWORD não definido nas variáveis de ambiente.')
}

// Configuração do pool de conexões
const poolConfig: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'net_imobiliaria',
  password: dbPassword || 'postgres',
  port: parseInt(process.env.DB_PORT || '15432'),

  // Configurações de pool para produção
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo limite para conexões ociosas
  connectionTimeoutMillis: 10000, // Tempo limite para estabelecer conexão

  // Configurações de encoding para UTF-8
  client_encoding: 'UTF8',

  // SSL para produção
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
}

// Criar pool de conexões
const pool = new Pool(poolConfig)

// Eventos de pool para monitoramento
pool.on('connect', (client) => {
  console.log('🔌 Nova conexão PostgreSQL estabelecida')
})

pool.on('error', (err, client) => {
  console.error('❌ Erro no pool PostgreSQL:', err)
})

pool.on('remove', (client) => {
  console.log('🔌 Conexão PostgreSQL removida do pool')
})

// Função para testar conexão
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    console.log('✅ Conexão PostgreSQL testada com sucesso')
    return true
  } catch (error) {
    console.error('❌ Erro ao testar conexão PostgreSQL:', error)
    return false
  }
}

// Função para fechar pool (usar no shutdown da aplicação)
export async function closePool(): Promise<void> {
  try {
    await pool.end()
    console.log('🔌 Pool PostgreSQL fechado com sucesso')
  } catch (error) {
    console.error('❌ Erro ao fechar pool PostgreSQL:', error)
  }
}

export { pool }
export default pool
