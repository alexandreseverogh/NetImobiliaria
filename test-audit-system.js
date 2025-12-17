/**
 * TESTE DO SISTEMA DE AUDITORIA
 * 
 * Este script testa se o sistema de auditoria está funcionando corretamente
 * após as correções das Guardian Rules.
 */

const { Pool } = require('pg')

// Configuração do banco (ajuste conforme necessário)
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'Roberto@2007'
})

async function testAuditSystem() {
  console.log('🧪 TESTE DO SISTEMA DE AUDITORIA')
  console.log('================================')
  
  try {
    // 1. Verificar se a tabela audit_logs existe
    console.log('\n1️⃣ Verificando se tabela audit_logs existe...')
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'audit_logs'
      );
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Tabela audit_logs existe')
    } else {
      console.log('❌ Tabela audit_logs NÃO existe')
      return
    }
    
    // 2. Verificar estrutura da tabela
    console.log('\n2️⃣ Verificando estrutura da tabela...')
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs'
      ORDER BY ordinal_position;
    `)
    
    console.log('📋 Estrutura da tabela audit_logs:')
    structure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULL)'}`)
    })
    
    // 3. Testar inserção de log de auditoria
    console.log('\n3️⃣ Testando inserção de log de auditoria...')
    const testLog = await pool.query(`
      INSERT INTO audit_logs (
        user_id, action, resource, resource_id, 
        details, ip_address, user_agent
      ) VALUES (
        NULL, 'TEST_AUDIT', 'test', NULL, 
        '{"test": "Sistema de auditoria reativado"}', 
        '127.0.0.1', 'Test Script'
      ) RETURNING id;
    `)
    
    const logId = testLog.rows[0].id
    console.log(`✅ Log de auditoria inserido com ID: ${logId}`)
    
    // 4. Verificar se o log foi inserido corretamente
    console.log('\n4️⃣ Verificando log inserido...')
    const verifyLog = await pool.query(`
      SELECT id, action, resource, details, timestamp 
      FROM audit_logs 
      WHERE id = $1;
    `, [logId])
    
    if (verifyLog.rows.length > 0) {
      console.log('✅ Log verificado com sucesso:')
      console.log(`   - ID: ${verifyLog.rows[0].id}`)
      console.log(`   - Ação: ${verifyLog.rows[0].action}`)
      console.log(`   - Recurso: ${verifyLog.rows[0].resource}`)
      console.log(`   - Data: ${verifyLog.rows[0].timestamp}`)
    } else {
      console.log('❌ Erro: Log não encontrado')
    }
    
    // 5. Limpar log de teste
    console.log('\n5️⃣ Limpando log de teste...')
    await pool.query('DELETE FROM audit_logs WHERE id = $1;', [logId])
    console.log('✅ Log de teste removido')
    
    console.log('\n🎉 SISTEMA DE AUDITORIA FUNCIONANDO CORRETAMENTE!')
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE DE AUDITORIA:')
    console.error(error.message)
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 DICA: Verifique se o PostgreSQL está rodando')
    } else if (error.code === '42P01') {
      console.log('\n💡 DICA: Tabela audit_logs não existe - execute o SQL de criação')
    }
  } finally {
    await pool.end()
  }
}

// Executar teste
testAuditSystem()
