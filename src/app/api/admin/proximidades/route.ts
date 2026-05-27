import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { findAllProximidades, createProximidade, findProximidadesPaginated } from '@/lib/database/proximidades'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { safeParseInt } from '@/lib/utils/safeParser'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

export async function GET(request: NextRequest) {
  try {
    // Verificação de permissão
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const { searchParams } = new URL(request.url)
    const page = safeParseInt(searchParams.get('page'), 1, 1)
    const limit = safeParseInt(searchParams.get('limit'), 10, 1, 100)
    const categoria = searchParams.get('categoria') || ''
    const search = searchParams.get('search') || ''

    // Se não há parâmetros de paginação, usar a função antiga para compatibilidade
    if (!searchParams.has('page') && !searchParams.has('limit')) {
      const proximidades = await findAllProximidades()
      return NextResponse.json(proximidades)
    }

    // Usar paginação com filtro de categoria e busca
    const result = await findProximidadesPaginated(page, limit, categoria, search)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar proximidades:', error)
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
    const { nome, categoria, descricao, ativo, icone } = body

    console.log('📥 Dados recebidos na API:', { nome, categoria, descricao, ativo, icone })

    if (!nome || !categoria) {
      return NextResponse.json(
        { error: 'Nome e categoria são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar o ID da categoria pelo nome diretamente no banco
    const categoriaQuery = `
      SELECT id, nome FROM categorias_proximidades 
      WHERE nome = $1 AND ativo = true
      LIMIT 1
    `
    const categoriaResult = await pool.query(categoriaQuery, [categoria])

    if (categoriaResult.rows.length === 0) {
      console.error('❌ Categoria não encontrada:', categoria)
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 400 }
      )
    }

    const categoriaEncontrada = categoriaResult.rows[0]
    console.log('✅ Categoria encontrada:', categoriaEncontrada)

    const novaProximidade = await createProximidade({
      nome,
      descricao: descricao || '',
      categoria_id: categoriaEncontrada.id,
      icone: icone || null,
      ativo: ativo !== undefined ? ativo : true,
      popular: false,
      ordem: 0
    })

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)

      await logAuditEvent({
        userId,
        action: 'CREATE',
        resource: 'proximidades',
        resourceId: novaProximidade.id,
        details: {
          nome: novaProximidade.nome,
          descricao: novaProximidade.descricao,
          categoria: categoria,
          categoria_id: novaProximidade.categoria_id,
          ativo: novaProximidade.ativo,
          popular: novaProximidade.popular,
          ordem: novaProximidade.ordem
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
      data: novaProximidade
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}



