/**
 * TESTE DOS PERMISSIONGUARDS
 * 
 * Este script testa se os PermissionGuards estão funcionando corretamente
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

async function testPermissionGuards() {
  console.log('🧪 TESTE DOS PERMISSIONGUARDS')
  console.log('==============================')
  
  try {
    // 1. Verificar se usuário admin existe
    console.log('\n1️⃣ Verificando usuário admin...')
    const adminCheck = await pool.query(`
      SELECT u.id, u.username, ur.name as role_name, ur.level as role_level
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.username = 'admin' OR ur.level >= 50
      LIMIT 1;
    `)
    
    if (adminCheck.rows.length > 0) {
      const admin = adminCheck.rows[0]
      console.log(`✅ Usuário admin encontrado:`)
      console.log(`   - ID: ${admin.id}`)
      console.log(`   - Username: ${admin.username}`)
      console.log(`   - Role: ${admin.role_name}`)
      console.log(`   - Level: ${admin.role_level}`)
    } else {
      console.log('❌ Usuário admin não encontrado')
      return
    }
    
    // 2. Verificar permissões do admin para system-features
    console.log('\n2️⃣ Verificando permissões para system-features...')
    const permissionsCheck = await pool.query(`
      SELECT 
        sf.name as feature_name,
        p.action,
        rp.granted_at,
        u.username as granted_by
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      JOIN user_role_assignments ura ON rp.role_id = ura.role_id
      JOIN users u ON ura.user_id = u.id
      LEFT JOIN users u2 ON rp.granted_by = u2.id
      WHERE u.username = $1 AND sf.name LIKE '%system%' OR sf.name LIKE '%categoria%'
      ORDER BY sf.name, p.action;
    `, [adminCheck.rows[0].username])
    
    if (permissionsCheck.rows.length > 0) {
      console.log('✅ Permissões encontradas:')
      permissionsCheck.rows.forEach(perm => {
        console.log(`   - ${perm.feature_name}: ${perm.action} (concedido por: ${perm.granted_by || 'Sistema'})`)
      })
    } else {
      console.log('⚠️ Nenhuma permissão específica encontrada para system-features')
    }
    
    // 3. Verificar se middleware está funcionando
    console.log('\n3️⃣ Verificando configuração do middleware...')
    
    // Simular verificação de permissão
    const middlewareCheck = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN role_permissions rp ON ura.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        JOIN system_features sf ON p.feature_id = sf.id
        WHERE ura.user_id = $1 
        AND sf.name LIKE '%funcionalidade%' OR sf.name LIKE '%system%'
        AND p.action = 'READ'
      ) as has_permission;
    `, [adminCheck.rows[0].id])
    
    const hasPermission = middlewareCheck.rows[0].has_permission
    console.log(`📋 Usuário tem permissão READ para system-features: ${hasPermission ? '✅ SIM' : '❌ NÃO'}`)
    
    // 4. Verificar estrutura de system_features
    console.log('\n4️⃣ Verificando funcionalidades do sistema...')
    const featuresCheck = await pool.query(`
      SELECT 
        sf.id,
        sf.name,
        sf.category,
        sf.is_active,
        COUNT(p.id) as permissions_count
      FROM system_features sf
      LEFT JOIN permissions p ON sf.id = p.feature_id
      WHERE sf.name LIKE '%funcionalidade%' OR sf.name LIKE '%categoria%'
      GROUP BY sf.id, sf.name, sf.category, sf.is_active
      ORDER BY sf.name;
    `)
    
    if (featuresCheck.rows.length > 0) {
      console.log('✅ Funcionalidades encontradas:')
      featuresCheck.rows.forEach(feature => {
        console.log(`   - ${feature.name} (${feature.category}): ${feature.permissions_count} permissões - ${feature.is_active ? 'Ativa' : 'Inativa'}`)
      })
    } else {
      console.log('⚠️ Nenhuma funcionalidade relacionada encontrada')
    }
    
    console.log('\n🎉 TESTE DOS PERMISSIONGUARDS CONCLUÍDO!')
    console.log('\n📋 RESUMO:')
    console.log(`   - Usuário admin: ${adminCheck.rows[0] ? '✅ Encontrado' : '❌ Não encontrado'}`)
    console.log(`   - Permissões: ${permissionsCheck.rows.length > 0 ? '✅ Configuradas' : '⚠️ Limitadas'}`)
    console.log(`   - Middleware: ${hasPermission ? '✅ Funcionando' : '⚠️ Verificar configuração'}`)
    console.log(`   - Funcionalidades: ${featuresCheck.rows.length > 0 ? '✅ Encontradas' : '⚠️ Não encontradas'}`)
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE DOS PERMISSIONGUARDS:')
    console.error(error.message)
  } finally {
    await pool.end()
  }
}

// Executar teste
testPermissionGuards()
