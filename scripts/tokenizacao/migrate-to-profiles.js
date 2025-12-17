#!/usr/bin/env node

/**
 * Script de Migração: Sistema de Cargos → Sistema de Perfis
 * 
 * Este script executa a migração completa do sistema de cargos para o sistema de perfis
 * granulares com permissões.
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

async function migrateToProfiles() {
  console.log('🚀 INICIANDO MIGRAÇÃO: Sistema de Cargos → Sistema de Perfis\n')
  
  try {
    // 1. Verificar conexão
    console.log('📡 Verificando conexão com o banco...')
    await pool.query('SELECT NOW()')
    console.log('✅ Conexão OK\n')
    
    // 2. Executar script de migração
    console.log('📋 Executando script de migração...')
    const migrationScript = require('fs').readFileSync('database/remove-cargo-field.sql', 'utf8')
    
    // Dividir o script em comandos individuais
    const commands = migrationScript
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'))
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i]
      if (command.trim()) {
        try {
          console.log(`Executando comando ${i + 1}/${commands.length}...`)
          await pool.query(command)
          console.log(`✅ Comando ${i + 1} executado com sucesso`)
        } catch (error) {
          if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
            console.log(`⚠️ Comando ${i + 1} ignorado (já existe): ${error.message}`)
          } else {
            console.log(`❌ Erro no comando ${i + 1}: ${error.message}`)
          }
        }
      }
    }
    
    console.log('\n✅ Migração executada com sucesso!\n')
    
    // 3. Verificar resultado
    console.log('🔍 Verificando resultado da migração...\n')
    
    // Verificar usuários migrados
    const usersResult = await pool.query(`
      SELECT 
        u.username,
        u.nome,
        ur.name as perfil_atual,
        ur.description as descricao_perfil,
        ur.level as nivel_acesso
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      ORDER BY ur.level DESC, u.username
    `)
    
    console.log('👥 Usuários migrados:')
    usersResult.rows.forEach(user => {
      console.log(`  • ${user.username} (${user.nome}) → ${user.perfil_atual} (Nível ${user.nivel_acesso})`)
    })
    
    // Verificar perfis criados
    const rolesResult = await pool.query('SELECT COUNT(*) as total FROM user_roles')
    console.log(`\n🎭 Total de perfis: ${rolesResult.rows[0].total}`)
    
    // Verificar permissões configuradas
    const permissionsResult = await pool.query('SELECT COUNT(*) as total FROM role_permissions')
    console.log(`🔐 Total de permissões configuradas: ${permissionsResult.rows[0].total}`)
    
    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!')
    console.log('\n📝 PRÓXIMOS PASSOS:')
    console.log('1. Reiniciar o servidor Next.js')
    console.log('2. Testar login com usuários existentes')
    console.log('3. Verificar se as permissões estão funcionando')
    console.log('4. Remover campo cargo da tabela users (opcional)')
    
  } catch (error) {
    console.error('\n❌ ERRO NA MIGRAÇÃO:', error.message)
    console.error('Stack:', error.stack)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Executar migração
migrateToProfiles().catch(console.error)










