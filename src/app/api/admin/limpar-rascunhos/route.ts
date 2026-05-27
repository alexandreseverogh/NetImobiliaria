import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('accessToken')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      is_system_role: decoded.is_system_role === true
    }
  } catch (error) {
    return null
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'imoveis', 'DELETE')
    if (denied) return denied

    console.log('🧹 API - Limpando tabela imovel_rascunho...')
    const currentUser = getCurrentUser(request)
    const tenantId = currentUser?.tenantId || null
    const isMaster = currentUser?.is_system_role === true

    let result
    if (isMaster) {
      // Master pode limpar todos os rascunhos de todos os tenants
      result = await pool.query('DELETE FROM imovel_rascunho')
    } else if (tenantId) {
      // 🛡️ ISOLAMENTO MULTI-TENANT: Limpar apenas rascunhos do próprio tenant
      result = await pool.query(
        'DELETE FROM imovel_rascunho WHERE imovel_id IN (SELECT id FROM imoveis WHERE tenant_id = $1)',
        [tenantId]
      )
    } else {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    
    console.log('✅ API - Tabela imovel_rascunho limpa:', result.rowCount, 'registros removidos')
    
    return NextResponse.json({
      success: true,
      message: 'Tabela imovel_rascunho limpa com sucesso',
      registrosRemovidos: result.rowCount
    })
    
  } catch (error) {
    console.error('❌ API - Erro ao limpar tabela imovel_rascunho:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}






