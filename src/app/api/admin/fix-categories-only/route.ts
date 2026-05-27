import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

// POST - Verificar e corrigir apenas categorias
export async function POST(request: NextRequest) {
  console.log('🔧 POST /api/admin/fix-categories-only chamado')
  
  try {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // 1. Verificar se tabela system_categorias existe e tem dados
      const categoriesCheck = await client.query(`
        SELECT COUNT(*) as total FROM system_categorias
      `)
      
      const totalCategories = parseInt(categoriesCheck.rows[0].total)
      console.log(`📊 Total de categorias: ${totalCategories}`)
      
      if (totalCategories === 0) {
        // Criar categorias padrão se não existirem
        await client.query(`
          INSERT INTO system_categorias (name, slug, description, icon, color, sort_order, is_active, created_by) VALUES
          ('Sistema', 'sistema', 'Funcionalidades de configuração e manutenção do sistema', 'CogIcon', '#6B7280', 1, true, 'cc8220f7-a3fd-40ed-8dbd-a22539328083'),
          ('Permissões', 'permissoes', 'Gestão de permissões e controle de acesso', 'LockClosedIcon', '#DC2626', 2, true, 'cc8220f7-a3fd-40ed-8dbd-a22539328083'),
          ('Administrativo', 'administrativo', 'Funcionalidades administrativas e de gestão', 'ShieldCheckIcon', '#059669', 3, true, 'cc8220f7-a3fd-40ed-8dbd-a22539328083'),
          ('Imóveis', 'imoveis', 'Gestão de imóveis e propriedades', 'HomeIcon', '#2563EB', 4, true, 'cc8220f7-a3fd-40ed-8dbd-a22539328083'),
          ('Clientes', 'clientes', 'Gestão de clientes e interessados', 'UserIcon', '#7C3AED', 5, true, 'cc8220f7-a3fd-40ed-8dbd-a22539328083'),
          ('Proprietários', 'proprietarios', 'Gestão de proprietários de imóveis', 'UserGroupIcon', '#EA580C', 6, true, 'cc8220f7-a3fd-40ed-8dbd-a22539328083'),
          ('Dashboard / Relatórios', 'dashboard-relatorios', 'Dashboards, relatórios e métricas do sistema', 'ChartBarIcon', '#0891B2', 7, true, 'cc8220f7-a3fd-40ed-8dbd-a22539328083')
        `)
        console.log('✅ Categorias padrão criadas')
      }
      
      // 2. Verificar se funcionalidade existe
      const featureCheck = await client.query(`
        SELECT id FROM system_features 
        WHERE url = '/admin/categorias' AND name = 'System Categorias'
      `)
      
      if (featureCheck.rows.length === 0) {
        await client.query(`
          INSERT INTO system_features (name, category, url, description, is_active) 
          VALUES ('System Categorias', 'system-categorias', '/admin/categorias', 'Gestão de categorias do sistema', true)
        `)
        console.log('✅ Funcionalidade System Categorias criada')
      }
      
      // 3. Verificar permissões básicas
      const featureId = featureCheck.rows.length > 0 ? featureCheck.rows[0].id : 
        (await client.query(`SELECT id FROM system_features WHERE url = '/admin/categorias'`)).rows[0].id
      
      const permissionsCheck = await client.query(`
        SELECT COUNT(*) as total FROM permissions WHERE feature_id = $1
      `, [featureId])
      
      if (parseInt(permissionsCheck.rows[0].total) === 0) {
        // Criar apenas permissão READ para aparecer no menu
        await client.query(`
          INSERT INTO permissions (feature_id, action, description) 
          VALUES ($1, 'READ', 'Visualizar categorias do sistema')
        `, [featureId])
        
        // Associar apenas ao Super Admin e Administrador
        const permId = (await client.query(`SELECT id FROM permissions WHERE feature_id = $1 AND action = 'READ'`, [featureId])).rows[0].id
        
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT r.id, $1
          FROM user_roles r
          WHERE r.is_system_role = true OR r.name ILIKE '%Administrador%'
          ON CONFLICT DO NOTHING
        `, [permId])
        
        console.log('✅ Permissão READ criada e associada')
      }
      
      await client.query('COMMIT')
      
      // Verificar resultado final
      const finalCheck = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM system_categorias) as categorias_total,
          (SELECT COUNT(*) FROM system_features WHERE url = '/admin/categorias') as funcionalidade_existe,
          (SELECT COUNT(*) FROM permissions p JOIN role_permissions rp ON p.id = rp.permission_id WHERE p.feature_id = (SELECT id FROM system_features WHERE url = '/admin/categorias')) as permissoes_associadas
      `)
      
      return NextResponse.json({
        success: true,
        message: 'Categorias sanadas com sucesso!',
        details: finalCheck.rows[0],
        next_step: 'Faça logout e login novamente para recarregar as permissões'
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('❌ Erro ao sanear categorias:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro ao sanear categorias: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}

