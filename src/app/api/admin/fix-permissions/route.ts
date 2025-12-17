import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

// POST - Corrigir permissões de system_categorias
export async function POST(request: NextRequest) {
  console.log('🔧 POST /api/admin/fix-permissions chamado')
  
  try {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // 1. Verificar se funcionalidade existe
      let featureResult = await client.query(`
        SELECT id FROM system_features 
        WHERE url = '/admin/categorias' AND name = 'System Categorias'
      `)
      
      if (featureResult.rows.length === 0) {
        console.log('📝 Criando funcionalidade System Categorias...')
        await client.query(`
          INSERT INTO system_features (name, category, url, description, is_active) 
          VALUES ('System Categorias', 'system-categorias', '/admin/categorias', 'Gestão de categorias do sistema', true)
        `)
        featureResult = await client.query(`
          SELECT id FROM system_features 
          WHERE url = '/admin/categorias' AND name = 'System Categorias'
        `)
      }
      
      const featureId = featureResult.rows[0].id
      console.log(`✅ Funcionalidade System Categorias ID: ${featureId}`)
      
      // 2. Criar permissões para system_categorias
      const permissions = [
        { action: 'READ', description: 'Visualizar categorias do sistema' },
        { action: 'UPDATE', description: 'Criar e editar categorias do sistema' },
        { action: 'DELETE', description: 'Excluir categorias do sistema' }
      ]
      
      const createdPermissions = []
      
      for (const perm of permissions) {
        const permResult = await client.query(`
          INSERT INTO permissions (feature_id, action, description) 
          VALUES ($1, $2, $3)
          ON CONFLICT (feature_id, action) DO NOTHING
          RETURNING id
        `, [featureId, perm.action, perm.description])
        
        if (permResult.rows.length > 0) {
          createdPermissions.push({
            id: permResult.rows[0].id,
            action: perm.action,
            description: perm.description
          })
          console.log(`✅ Permissão criada: ${perm.action}`)
          
          // 3. Associar permissões aos roles
          await client.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r.id, $1
            FROM user_roles r
            WHERE r.name IN ('Super Admin', 'Administrador')
            ON CONFLICT DO NOTHING
          `, [permResult.rows[0].id])
          
          console.log(`✅ Permissão ${perm.action} associada aos roles`)
        }
      }
      
      await client.query('COMMIT')
      
      return NextResponse.json({
        success: true,
        message: 'Permissões de system_categorias corrigidas com sucesso!',
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
    console.error('❌ Erro ao corrigir permissões:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro ao corrigir permissões: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

