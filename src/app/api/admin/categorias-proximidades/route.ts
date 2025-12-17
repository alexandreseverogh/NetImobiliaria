import { NextResponse, NextRequest } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { findAllCategoriasProximidades, createCategoriaProximidade } from '@/lib/database/proximidades'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

export async function GET(request: NextRequest) {
  try {
    // Verificação de permissão
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck
    
    const categorias = await findAllCategoriasProximidades()
    
    // Retornar diretamente o array para compatibilidade com o frontend
    return NextResponse.json(categorias)
  } catch (error) {
    console.error('Erro ao listar categorias de proximidades:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificação de permissão
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck
    
    const body = await request.json()
    
    const { nome, descricao, icone, cor, ordem, ativo } = body
    
    if (!nome || !descricao) {
      return NextResponse.json(
        { error: 'Nome e descrição são obrigatórios' },
        { status: 400 }
      )
    }
    
    const novaCategoria = await createCategoriaProximidade({
      nome,
      descricao,
      icone: icone || 'map-pin',
      cor: cor || '#10B981',
      ordem: ordem || 1,
      ativo: ativo !== undefined ? ativo : true
    })
    
    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'CREATE',
        resource: 'categorias-proximidades',
        resourceId: novaCategoria.id,
        details: {
          nome: novaCategoria.nome,
          descricao: novaCategoria.descricao,
          icone: novaCategoria.icone,
          cor: novaCategoria.cor,
          ordem: novaCategoria.ordem,
          ativo: novaCategoria.ativo
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }
    
    return NextResponse.json({
      success: true,
      data: novaCategoria
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar categoria de proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}






