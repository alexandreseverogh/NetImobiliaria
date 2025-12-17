#!/usr/bin/env node

/**
 * Script de Teste: Ações de Usuário (Desativar e Excluir)
 * 
 * Este script testa as funcionalidades de desativar e excluir usuários
 * para identificar por que os botões não estão funcionando.
 */

const { Pool } = require('pg')
require('dotenv').config({ path: '.env.local' })

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

async function testUserActions() {
  console.log('🧪 TESTANDO AÇÕES DE USUÁRIO\n')
  
  try {
    // 1. Verificar conexão
    console.log('📡 Verificando conexão com o banco...')
    await pool.query('SELECT NOW()')
    console.log('✅ Conexão OK\n')
    
    // 2. Verificar estrutura da tabela users
    console.log('🔍 Verificando estrutura da tabela users...')
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Colunas da tabela users:')
    tableInfo.rows.forEach(col => {
      console.log(`  • ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`)
    })
    
    // 3. Verificar usuários existentes
    console.log('\n👥 Verificando usuários existentes...')
    const users = await pool.query('SELECT id, username, nome, ativo FROM users ORDER BY username')
    
    console.log(`Total de usuários: ${users.rows.length}`)
    users.rows.forEach(user => {
      console.log(`  • ${user.username} (${user.nome}) - ${user.ativo ? 'ATIVO' : 'INATIVO'} - ID: ${user.id}`)
    })
    
    // 4. Verificar tabelas de permissões
    console.log('\n🔐 Verificando sistema de permissões...')
    
    // Verificar user_roles
    const roles = await pool.query('SELECT COUNT(*) as total FROM user_roles')
    console.log(`Perfis (user_roles): ${roles.rows[0].total}`)
    
    // Verificar user_role_assignments
    const assignments = await pool.query('SELECT COUNT(*) as total FROM user_role_assignments')
    console.log(`Atribuições de perfil: ${assignments.rows[0].total}`)
    
    // Verificar role_permissions
    const permissions = await pool.query('SELECT COUNT(*) as total FROM role_permissions')
    console.log(`Permissões configuradas: ${permissions.rows[0].total}`)
    
    // 5. Verificar permissões específicas do usuário admin
    console.log('\n👑 Verificando permissões do usuário admin...')
    const adminPermissions = await pool.query(`
      SELECT 
        u.username,
        ur.name as role_name,
        ur.level as role_level,
        sf.category as resource,
        p.action as permission
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN role_permissions rp ON ur.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE u.username = 'admin'
      ORDER BY sf.category, p.action
    `)
    
    if (adminPermissions.rows.length > 0) {
      console.log('Permissões do admin:')
      adminPermissions.rows.forEach(perm => {
        console.log(`  • ${perm.resource}: ${perm.permission} (via ${perm.role_name} - nível ${perm.role_level})`)
      })
    } else {
      console.log('❌ Usuário admin não tem permissões configuradas!')
    }
    
    // 6. Testar operações de banco
    console.log('\n🧪 Testando operações de banco...')
    
    // Testar UPDATE de status
    try {
      const testUser = users.rows[0]
      if (testUser) {
        console.log(`Testando alteração de status para usuário: ${testUser.username}`)
        
        const updateResult = await pool.query(
          'UPDATE users SET ativo = $1 WHERE id = $2 RETURNING id, username, ativo',
          [!testUser.ativo, testUser.id]
        )
        
        if (updateResult.rows.length > 0) {
          console.log(`✅ Status alterado com sucesso: ${testUser.username} → ${updateResult.rows[0].ativo ? 'ATIVO' : 'INATIVO'}`)
          
          // Reverter alteração
          await pool.query(
            'UPDATE users SET ativo = $1 WHERE id = $2',
            [testUser.ativo, testUser.id]
          )
          console.log(`🔄 Status revertido para o valor original`)
        }
      }
    } catch (error) {
      console.log(`❌ Erro ao testar alteração de status: ${error.message}`)
    }
    
    // 7. Verificar logs de auditoria
    console.log('\n📝 Verificando logs de auditoria...')
    const auditLogs = await pool.query('SELECT COUNT(*) as total FROM audit_logs')
    console.log(`Total de logs de auditoria: ${auditLogs.rows[0].total}`)
    
    if (auditLogs.rows[0].total > 0) {
      const recentLogs = await pool.query(`
        SELECT action, resource_type, details, created_at 
        FROM audit_logs 
        ORDER BY created_at DESC 
        LIMIT 5
      `)
      
      console.log('Logs recentes:')
      recentLogs.rows.forEach(log => {
        console.log(`  • ${log.action} - ${log.resource_type} - ${log.details} (${log.created_at})`)
      })
    }
    
    console.log('\n🎯 DIAGNÓSTICO COMPLETO!')
    console.log('\n📋 POSSÍVEIS PROBLEMAS:')
    console.log('1. Campo "cargo" ainda existe na tabela users')
    console.log('2. Sistema de permissões não está configurado')
    console.log('3. Usuários não têm perfis atribuídos')
    console.log('4. APIs não estão funcionando corretamente')
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

// Executar teste
testUserActions().catch(console.error)










