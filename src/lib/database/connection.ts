import { Pool, PoolConfig } from 'pg'

const dbPassword = process.env.DB_PASSWORD
if (!dbPassword) {
  // Evita hardcoding e torna o problema explícito em ambientes sem configuração.
  console.warn('⚠️ DB_PASSWORD não definido nas variáveis de ambiente.')
}

const dbName = process.env.DB_NAME
if (!dbName) {
  throw new Error('❌ ERRO CRÍTICO: DB_NAME não definido nas variáveis de ambiente. Verifique o arquivo .env.local')
}

const dbHost = process.env.DB_HOST || 'localhost'
const dbPort = process.env.DB_PORT || '15432'

console.log('🚀 [DB CONNECTION DEBUG] Iniciando pool de conexões:', {
  timestamp: new Date().toISOString(),
  host: dbHost,
  port: dbPort,
  database: dbName,
  env_db: process.env.DB_NAME // para ver se tem algo vindo do env
})

const poolConfig: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: dbHost,
  database: dbName,
  password: dbPassword || 'postgres',
  port: parseInt(dbPort),

  // Configurações de pool para produção
  max: 20, // Máximo de conexões no pool
  idleTimeoutMillis: 30000, // Tempo limite para conexões ociosas
  connectionTimeoutMillis: 10000, // Tempo limite para estabelecer conexão

  // Configurações de encoding para UTF-8
  client_encoding: 'UTF8',

  // SSL: desabilitado se DB_SSL=false (para Docker interno sem SSL)
  // Em produção com DB externo (RDS, Cloud SQL etc.), remover DB_SSL=false do .env
  ssl: process.env.DB_SSL === 'false'
    ? false
    : process.env.NODE_ENV === 'production'
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
