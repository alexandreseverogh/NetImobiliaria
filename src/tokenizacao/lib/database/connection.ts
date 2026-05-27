import pool from '@/lib/database/connection';

// Re-exporta o pool centralizado para garantir que toda a aplicação 
// utilize a mesma instância e evite vazamento de conexões.
export { testConnection, closePool } from '@/lib/database/connection';
export default pool;
