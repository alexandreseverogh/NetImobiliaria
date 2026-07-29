import { NextResponse, NextRequest } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { findAllCategoriasAmenidades, createCategoriaAmenidade } from '@/lib/database/amenidades'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

export async function GET(request: NextRequest) {
  try {
    // Verificação de permissão
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck
    
    const token = request.cookies.get('admin_auth_token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
    let tenantId = undefined
    if (token) {
      const decoded = await import('@/lib/auth/jwt').then(m => m.verifyToken(token))
      tenantId = !decoded?.is_system_role ? decoded?.tenantId : undefined
    }

    console.log('🔄 API: Iniciando busca de categorias de amenidades...')
    
    const categorias = await findAllCategoriasAmenidades(tenantId)
    console.log(`✅ API: ${categorias.length} categorias encontradas`)
    
    // Retornar diretamente o array para compatibilidade com o frontend
    return NextResponse.json(categorias)
  } catch (error) {
    console.error('❌ API: Erro ao listar categorias de amenidades:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'imoveis', 'CREATE')
    if (denied) return denied

    // Verificação de permissão
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const body = await request.json()

    console.log('📝 POST /api/admin/categorias-amenidades - Body recebido:', body)
    
    const { nome, descricao, icone, cor, ordem, ativo } = body
    
    if (!nome || !descricao) {
      console.log('❌ Validação falhou: nome ou descrição faltando')
      return NextResponse.json(
        { error: 'Nome e descrição são obrigatórios' },
        { status: 400 }
      )
    }
    
    console.log('📝 Criando categoria com dados:', { nome, descricao, icone, cor, ordem, ativo })
    
    const token = request.cookies.get('admin_auth_token')?.value || request.headers.get('authorization')?.replace('Bearer ', '')
    let tenantId = undefined
    if (token) {
      const decoded = await import('@/lib/auth/jwt').then(m => m.verifyToken(token))
      tenantId = !decoded?.is_system_role ? decoded?.tenantId : undefined
    }

    const novaCategoria = await createCategoriaAmenidade({
      nome,
      descricao,
      icone: icone || 'star',
      cor: cor || '#3B82F6',
      ordem: ordem || 1,
      ativo: ativo !== undefined ? ativo : true,
      tenant_id: tenantId
    })
    
    console.log('✅ Categoria criada:', novaCategoria)
    
    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'CREATE',
        resource: 'categorias-amenidades',
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
    
  } catch (error: any) {
    console.error('❌ Erro ao criar categoria de amenidade:', error)
    console.error('❌ Stack trace:', error?.stack)
    console.error('❌ Mensagem:', error?.message)
    console.error('❌ Error code (PostgreSQL):', error?.code)
    console.error('❌ Error detail:', error?.detail)
    
    // Verificar se é erro de duplicação (código 23505 do PostgreSQL)
    if (error?.code === '23505' || (error?.message && error.message.includes('duplicate key'))) {
      return NextResponse.json(
        { error: 'Já existe uma categoria com este nome' },
        { status: 400 }
      )
    }
    
    // Verificar se é erro de constraint NOT NULL
    if (error?.code === '23502') {
      return NextResponse.json(
        { error: `Campo obrigatório faltando: ${error?.column || 'desconhecido'}` },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error?.message || 'Erro desconhecido',
        code: error?.code
      },
      { status: 500 }
    )
  }
}






