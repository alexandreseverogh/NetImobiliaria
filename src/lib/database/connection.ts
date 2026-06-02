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

  // ============================================================
  // Pool otimizado — conservador em dev (evita esgotar max_connections do PG)
  // Em prod usa DB_POOL_MAX/MIN via variável de ambiente.
  // ============================================================
  max: parseInt(process.env.DB_POOL_MAX || '10'),         // 10 conexões simultâneas (dev-safe)
  min: parseInt(process.env.DB_POOL_MIN || '0'),          // 0 conexões de aquecimento (lazy)
  idleTimeoutMillis: 30000,                               // 30s antes de fechar conexão ociosa
  connectionTimeoutMillis: 30000,                         // 30s para estabelecer nova conexão
  allowExitOnIdle: true,                                  // Libera conexões quando ociosas

  // Timeouts de query (previne queries travadas)
  statement_timeout: 30000,                               // 30s máximo por query

  // Configurações de encoding e performance
  client_encoding: 'UTF8',
  application_name: 'net-imobiliaria',                    // Visível no pg_stat_activity

  // KeepAlive: evita drops de conexão por firewall/NAT na VPS
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,

  // SSL: desabilitado se DB_SSL=false (para Docker interno sem SSL)
  // Em produção com DB externo (RDS, Cloud SQL etc.), remover DB_SSL=false do .env
  ssl: process.env.DB_SSL === 'false'
    ? false
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false
}

// ============================================================
// Singleton Pattern para evitar vazamento de conexões (Hot-Reload)
// ============================================================
declare global {
  var pgPool: Pool | undefined;
}

const pool = global.pgPool || new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') {
  global.pgPool = pool;
}

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
