import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

// POST - Configurar permissões completas para categorias
export async function POST(request: NextRequest) {
  console.log('🔧 POST /api/admin/setup-categories-permissions chamado')
  
  try {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // 1. Verificar/criar funcionalidade
      let featureResult = await client.query(`
        SELECT id FROM system_features 
        WHERE url = '/admin/categorias' AND name = 'System Categorias'
      `)
      
      if (featureResult.rows.length === 0) {
        await client.query(`
          INSERT INTO system_features (name, category, url, description, is_active) 
          VALUES ('System Categorias', 'system-categorias', '/admin/categorias', 'Gestão completa de categorias do sistema', true)
        `)
        featureResult = await client.query(`
          SELECT id FROM system_features 
          WHERE url = '/admin/categorias' AND name = 'System Categorias'
        `)
      }
      
      const featureId = featureResult.rows[0].id
      console.log(`✅ Funcionalidade System Categorias ID: ${featureId}`)
      
      // 2. Limpar permissões existentes para esta funcionalidade
      await client.query('DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE feature_id = $1)', [featureId])
      await client.query('DELETE FROM permissions WHERE feature_id = $1', [featureId])
      
      // 3. Criar permissões completas
      const permissions = [
        { action: 'READ', description: 'Visualizar categorias do sistema' },
        { action: 'UPDATE', description: 'Criar e editar categorias do sistema' },
        { action: 'DELETE', description: 'Excluir categorias do sistema' },
        { action: 'ADMIN', description: 'Administração completa de categorias' }
      ]
      
      const createdPermissions = []
      
      for (const perm of permissions) {
        const permResult = await client.query(`
          INSERT INTO permissions (feature_id, action, description) 
          VALUES ($1, $2, $3)
          RETURNING id
        `, [featureId, perm.action, perm.description])
        
        const permissionId = permResult.rows[0].id
        createdPermissions.push({
          id: permissionId,
          action: perm.action,
          description: perm.description
        })
        
        console.log(`✅ Permissão criada: ${perm.action}`)
        
        // 4. Associar permissões aos perfis Masters (Sistema)
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT r.id, $1
          FROM user_roles r
          WHERE r.is_system_role = true
        `, [permissionId])
        
        console.log(`✅ Permissão ${perm.action} associada aos roles`)
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        message: 'Permissões de categorias configuradas com sucesso!',
        feature_id: featureId,
        permissions_created: createdPermissions.length,
        permissions: createdPermissions
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Erro ao configurar permissões:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro ao configurar permissões: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

