import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'

// POST /api/admin/sync-feature-categories - Executar sincronização manual
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão de administrador
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    console.log('🔄 Iniciando sincronização manual de categorias...')

    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // 1. Executar função de sincronização
      console.log('📋 Executando sync_all_feature_categories()...')
      const syncResult = await client.query('SELECT * FROM sync_all_feature_categories()')
      const syncedFeatures = syncResult.rows

      // 2. Validar consistência após sincronização
      console.log('🔍 Validando consistência...')
      const validationResult = await client.query('SELECT * FROM validate_feature_category_consistency()')
      const validationData = validationResult.rows

      // 3. Contar inconsistências
      const inconsistencies = validationData.filter(row => row.status !== 'CONSISTENTE')
      const consistentCount = validationData.filter(row => row.status === 'CONSISTENTE').length

      // 4. Log de inconsistências se houver
      if (inconsistencies.length > 0) {
        console.log('⚠️ Inconsistências encontradas:')
        inconsistencies.forEach(row => {
          console.log(`- ${row.feature_name}: ${row.status} (SF: ${row.sf_category_id}, SFC: ${row.sfc_category_id})`)
        })
      }

      // 5. Estatísticas finais
      const stats = {
        total_features: validationData.length,
        consistent_features: consistentCount,
        inconsistent_features: inconsistencies.length,
        synced_features: syncedFeatures.length,
        status: inconsistencies.length === 0 ? 'CONSISTENTE' : 'INCONSISTENTE'
      }

      console.log('📊 Estatísticas:', stats)

      await client.query('COMMIT')

      return NextResponse.json({
        success: true,
        message: `Sincronização concluída! ${syncedFeatures.length} funcionalidades sincronizadas.`,
        data: {
          stats,
          synced_features: syncedFeatures,
          validation: validationData,
          inconsistencies: inconsistencies.length > 0 ? inconsistencies : null
        }
      })

    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }

  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor na sincronização',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// GET /api/admin/sync-feature-categories - Verificar status de consistência
export async function GET(request: NextRequest) {
  try {
    // Verificar permissão de listar categorias
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    console.log('🔍 Verificando status de consistência...')

    // Executar validação
    const validationResult = await pool.query('SELECT * FROM validate_feature_category_consistency()')
    const validationData = validationResult.rows

    // Agrupar por status
    const statusCounts = validationData.reduce((acc, row) => {
      acc[row.status] = (acc[row.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Identificar inconsistências
    const inconsistencies = validationData.filter(row => row.status !== 'CONSISTENTE')
    const isConsistent = inconsistencies.length === 0

    // Estatísticas
    const stats = {
      total_features: validationData.length,
      consistent_features: statusCounts.CONSISTENTE || 0,
      inconsistent_features: inconsistencies.length,
      status: isConsistent ? 'CONSISTENTE' : 'INCONSISTENTE',
      status_breakdown: statusCounts
    }

    console.log('📊 Status de consistência:', stats)

    return NextResponse.json({
      success: true,
      data: {
        stats,
        validation: validationData,
        inconsistencies: inconsistencies.length > 0 ? inconsistencies : null,
        needs_sync: !isConsistent
      }
    })

  } catch (error) {
    console.error('❌ Erro ao verificar consistência:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor ao verificar consistência',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
