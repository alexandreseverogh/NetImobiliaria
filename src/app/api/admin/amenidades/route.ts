import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { findAllAmenidades, createAmenidade, findAmenidadesPaginated } from '@/lib/database/amenidades'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import pool from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    // Verificação de permissão (ADICIONADA - não existia antes!)
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const categoria = searchParams.get('categoria') || ''
    const search = searchParams.get('search') || ''
    
    // Se não há parâmetros de paginação, usar a função antiga para compatibilidade
    if (!searchParams.has('page') && !searchParams.has('limit')) {
      const amenidades = await findAllAmenidades()
      return NextResponse.json(amenidades)
    }
    
    // Usar paginação com filtro de categoria e busca
    const result = await findAmenidadesPaginated(page, limit, categoria, search)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar amenidades:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificação de permissão (ADICIONADA - não existia antes!)
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck
    
    const body = await request.json()
    const { nome, categoria, descricao, ativo }: {
      nome: string
      categoria: string
      descricao?: string
      ativo?: boolean
    } = body
    
    console.log('📥 Dados recebidos na API:', { nome, categoria, descricao, ativo })
    
    if (!nome || !categoria) {
      return NextResponse.json(
        { error: 'Nome e categoria são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Buscar o ID da categoria pelo nome diretamente no banco
    const categoriaQuery = `
      SELECT id, nome FROM categorias_amenidades 
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
    
    const novaAmenidade = await createAmenidade({
      nome,
      descricao: descricao || '',
      categoria_id: categoriaEncontrada.id,
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
        resource: 'amenidades',
        resourceId: novaAmenidade.id,
        details: {
          nome: novaAmenidade.nome,
          descricao: novaAmenidade.descricao,
          categoria: categoria,
          categoria_id: novaAmenidade.categoria_id,
          ativo: novaAmenidade.ativo,
          popular: novaAmenidade.popular,
          ordem: novaAmenidade.ordem
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
      data: novaAmenidade
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar amenidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}



