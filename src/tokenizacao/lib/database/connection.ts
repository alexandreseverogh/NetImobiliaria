/* eslint-disable */
import { Pool, PoolConfig } from 'pg'

// ConfiguraÃ§Ã£o do pool de conexÃµes
const poolConfig: PoolConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME!,
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  
  // ConfiguraÃ§Ãµes de pool para produÃ§Ã£o
  max: 20, // MÃ¡ximo de conexÃµes no pool
  idleTimeoutMillis: 30000, // Tempo limite para conexÃµes ociosas
  connectionTimeoutMillis: 2000, // Tempo limite para estabelecer conexÃ£o
  
  // ConfiguraÃ§Ãµes de encoding para UTF-8
  client_encoding: 'UTF8',
  
  // SSL para produÃ§Ã£o
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
}

// Criar pool de conexÃµes
const pool = new Pool(poolConfig)

// Eventos de pool para monitoramento
pool.on('connect', (client) => {
  console.log('ðŸ”Œ Nova conexÃ£o PostgreSQL estabelecida')
})

pool.on('error', (err, client) => {
  console.error('âŒ Erro no pool PostgreSQL:', err)
})

pool.on('remove', (client) => {
  console.log('ðŸ”Œ ConexÃ£o PostgreSQL removida do pool')
})

// FunÃ§Ã£o para testar conexÃ£o
export async function testConnection(): Promise<boolean> {
  try {
    const client = await pool.connect()
    await client.query('SELECT NOW()')
    client.release()
    console.log('âœ… ConexÃ£o PostgreSQL testada com sucesso')
    return true
  } catch (error) {
    console.error('âŒ Erro ao testar conexÃ£o PostgreSQL:', error)
    return false
  }
}

// FunÃ§Ã£o para fechar pool (usar no shutdown da aplicaÃ§Ã£o)
export async function closePool(): Promise<void> {
  try {
    await pool.end()
    console.log('ðŸ”Œ Pool PostgreSQL fechado com sucesso')
  } catch (error) {
    console.error('âŒ Erro ao fechar pool PostgreSQL:', error)
  }
}

export default pool

