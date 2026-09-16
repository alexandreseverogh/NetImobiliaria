import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
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

// GET - Verificar se existe rascunho ativo para o imóvel
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API GET /api/admin/imoveis/[id]/rascunho - INICIADA')
  console.log('🔍 API - Parâmetros recebidos:', params)
  
  try {
    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    const currentUser = getCurrentUser(request)
    const tenantId = currentUser?.tenantId || null
    const isMaster = currentUser?.is_system_role === true

    // 🛡️ ISOLAMENTO MULTI-TENANT
    const result = await pool.query(
      `SELECT r.* FROM imovel_rascunho r
       JOIN imoveis i ON r.imovel_id = i.id
       WHERE r.imovel_id = $1 AND r.ativo = true
       ${!isMaster ? 'AND i.tenant_id = $2' : ''}
       ORDER BY r.timestamp_inicio DESC 
       LIMIT 1`,
      !isMaster ? [imovelId, tenantId] : [imovelId]
    )

    if (result.rows.length === 0) {
      console.log('ℹ️ Nenhum rascunho ativo encontrado para o imóvel:', imovelId)
      return NextResponse.json({
        success: true,
        rascunho: null
      }, { status: 200 }) // 200 ao invés de 404 - não é um erro, apenas não há rascunho
    }

    const rascunho = result.rows[0]
    console.log('🔍 Rascunho ativo encontrado:', rascunho)

    return NextResponse.json({
      success: true,
      rascunho: {
        id: rascunho.id,
        imovelId: rascunho.imovel_id,
        usuarioId: rascunho.usuario_id,
        timestampInicio: rascunho.timestamp_inicio,
        alteracoes: rascunho.alteracoes,
        ativo: rascunho.ativo
      }
    })

  } catch (error) {
    console.error('Erro ao buscar rascunho:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo rascunho
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API POST /api/admin/imoveis/[id]/rascunho - INICIADA')

  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'imoveis', 'UPDATE')
    if (denied) return denied

    const imovelId = parseInt(params.id)
    const body = await request.json()
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    const currentUser = getCurrentUser(request)
    const tenantId = currentUser?.tenantId || null
    const isMaster = currentUser?.is_system_role === true
    const currentUserId = currentUser?.userId

    // 🛡️ ISOLAMENTO MULTI-TENANT: Verificar permissão no imóvel antes de criar rascunho
    const imovelCheck = await pool.query('SELECT tenant_id FROM imoveis WHERE id = $1', [imovelId])
    if (imovelCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
    }
    if (!isMaster && imovelCheck.rows[0].tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Sem permissão para este imóvel' }, { status: 403 })
    }

    // Verificar se já existe rascunho ativo
    const existingRascunho = await pool.query(
      'SELECT id FROM imovel_rascunho WHERE imovel_id = $1 AND ativo = true',
      [imovelId]
    )

    if (existingRascunho.rows.length > 0) {
      console.log('🔍 Rascunho ativo já existe, retornando existente')
      const rascunhoExistente = await pool.query(
        'SELECT * FROM imovel_rascunho WHERE imovel_id = $1 AND ativo = true',
        [imovelId]
      )
      
      const rascunho = rascunhoExistente.rows[0]
      return NextResponse.json({
        success: true,
        rascunho: {
          id: rascunho.id,
          imovelId: rascunho.imovel_id,
          usuarioId: rascunho.usuario_id,
          timestampInicio: rascunho.timestamp_inicio,
          alteracoes: rascunho.alteracoes,
          ativo: rascunho.ativo
        }
      })
    }

    // Criar novo rascunho
    const result = await pool.query(
      `INSERT INTO imovel_rascunho (imovel_id, usuario_id, alteracoes, tenant_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        imovelId,
        currentUserId || 1, // Fallback se não houver ID (ex: debug)
        JSON.stringify(body.alteracoes || {
          imagens: { adicionadas: [], removidas: [] },
          documentos: { adicionados: [], removidos: [] },
          dadosBasicos: {}
        }),
        tenantId
      ]
    )

    const rascunho = result.rows[0]
    console.log('✅ Rascunho criado:', rascunho)

    return NextResponse.json({
      success: true,
      rascunho: {
        id: rascunho.id,
        imovelId: rascunho.imovel_id,
        usuarioId: rascunho.usuario_id,
        timestampInicio: rascunho.timestamp_inicio,
        alteracoes: rascunho.alteracoes,
        ativo: rascunho.ativo
      }
    })

  } catch (error) {
    console.error('Erro ao criar rascunho:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar alterações do rascunho
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API PUT /api/admin/imoveis/[id]/rascunho - INICIADA')

  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'imoveis', 'UPDATE')
    if (denied) return denied

    const imovelId = parseInt(params.id)
    const body = await request.json()
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    const currentUser = getCurrentUser(request)
    const tenantId = currentUser?.tenantId || null
    const isMaster = currentUser?.is_system_role === true

    // 🛡️ ISOLAMENTO MULTI-TENANT
    const result = await pool.query(
      `UPDATE imovel_rascunho r
       SET alteracoes = $1, updated_at = NOW()
       FROM imoveis i
       WHERE r.imovel_id = i.id AND r.imovel_id = $2 AND r.ativo = true
       ${!isMaster ? 'AND i.tenant_id = $3' : ''}
       RETURNING r.*`,
      !isMaster ? [JSON.stringify(body.alteracoes), imovelId, tenantId] : [JSON.stringify(body.alteracoes), imovelId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum rascunho ativo encontrado' },
        { status: 404 }
      )
    }

    const rascunho = result.rows[0]
    console.log('✅ Rascunho atualizado:', rascunho)

    return NextResponse.json({
      success: true,
      rascunho: {
        id: rascunho.id,
        imovelId: rascunho.imovel_id,
        usuarioId: rascunho.usuario_id,
        timestampInicio: rascunho.timestamp_inicio,
        alteracoes: rascunho.alteracoes,
        ativo: rascunho.ativo
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar rascunho:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Descartar rascunho (reverter alterações)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 API DELETE /api/admin/imoveis/[id]/rascunho - INICIADA')

  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'imoveis', 'UPDATE')
    if (denied) return denied

    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    const currentUser = getCurrentUser(request)
    const tenantId = currentUser?.tenantId || null
    const isMaster = currentUser?.is_system_role === true

    // 🛡️ ISOLAMENTO MULTI-TENANT
    const rascunhoResult = await pool.query(
      `SELECT r.* FROM imovel_rascunho r
       JOIN imoveis i ON r.imovel_id = i.id
       WHERE r.imovel_id = $1 AND r.ativo = true
       ${!isMaster ? 'AND i.tenant_id = $2' : ''}`,
      !isMaster ? [imovelId, tenantId] : [imovelId]
    )

    if (rascunhoResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum rascunho ativo encontrado' },
        { status: 404 }
      )
    }

    const rascunho = rascunhoResult.rows[0]
    const alteracoes = rascunho.alteracoes

    console.log('🔍 Revertendo alterações do rascunho:', alteracoes)

    // Reverter alterações
    await pool.query('BEGIN')

    try {
      // Reverter imagens removidas (restaurar)
      if (alteracoes.imagens?.removidas?.length > 0) {
        await pool.query(
          `UPDATE imovel_imagens 
           SET ativo = true, updated_at = NOW()
           WHERE id = ANY($1) AND imovel_fk = $2`,
          [alteracoes.imagens.removidas, imovelId]
        )
        console.log('✅ Imagens removidas restauradas:', alteracoes.imagens.removidas)
      }

      // Remover imagens adicionadas
      if (alteracoes.imagens?.adicionadas?.length > 0) {
        await pool.query(
          'DELETE FROM imovel_imagens WHERE id = ANY($1) AND imovel_fk = $2',
          [alteracoes.imagens.adicionadas, imovelId]
        )
        console.log('✅ Imagens adicionadas removidas:', alteracoes.imagens.adicionadas)
      }

      // Reverter documentos removidos (restaurar)
      if (alteracoes.documentos?.removidos?.length > 0) {
        await pool.query(
          `UPDATE imovel_documentos 
           SET ativo = true, updated_at = NOW()
           WHERE id = ANY($1) AND imovel_fk = $2`,
          [alteracoes.documentos.removidos, imovelId]
        )
        console.log('✅ Documentos removidos restaurados:', alteracoes.documentos.removidos)
      }

      // Remover documentos adicionados
      if (alteracoes.documentos?.adicionados?.length > 0) {
        await pool.query(
          'DELETE FROM imovel_documentos WHERE id = ANY($1) AND imovel_fk = $2',
          [alteracoes.documentos.adicionados, imovelId]
        )
        console.log('✅ Documentos adicionados removidos:', alteracoes.documentos.adicionados)
      }

      // Marcar rascunho como inativo
      await pool.query(
        'UPDATE imovel_rascunho SET ativo = false, updated_at = NOW() WHERE id = $1',
        [rascunho.id]
      )

      await pool.query('COMMIT')
      console.log('✅ Rascunho descartado com sucesso')

      return NextResponse.json({
        success: true,
        message: 'Rascunho descartado com sucesso'
      })

    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Erro ao descartar rascunho:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
