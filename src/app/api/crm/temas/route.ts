import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

/**
 * TEMAS DO CICLO DE VENDAS (CRM) — por tenant.
 * Ex.: "Venda de Imóveis", "Aluguel de Imóveis".
 */

function getCurrentUser(request: NextRequest): { tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null
    return { tenantId: decoded.tenantId, is_system_role: decoded.is_system_role === true }
  } catch {
    return null
  }
}

// LISTAR temas ativos do tenant logado (Master pode passar ?tenant_id=)
export async function GET(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const tenantId = user.is_system_role ? (searchParams.get('tenant_id') || user.tenantId) : user.tenantId
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

    const { rows } = await pool.query(
      `SELECT id, nome FROM public.temas WHERE tenant_id = $1 AND ativo = true ORDER BY nome ASC`,
      [tenantId],
    )
    return NextResponse.json({ success: true, temas: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// CRIAR ou RENOMEAR tema
export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user?.tenantId && !user?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const body = await request.json()
    const nome = typeof body.nome === 'string' ? body.nome.trim() : ''
    if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    if (nome.length > 120) return NextResponse.json({ error: 'Nome deve ter no máximo 120 caracteres' }, { status: 400 })

    const tenantId = user.is_system_role ? (body.tenant_id || user.tenantId) : user.tenantId
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

    try {
      if (body.id) {
        const { rows } = await pool.query(
          `UPDATE public.temas SET nome = $1, updated_at = NOW()
            WHERE id = $2 AND tenant_id = $3 AND ativo = true RETURNING id, nome`,
          [nome, body.id, tenantId],
        )
        if (rows.length === 0) return NextResponse.json({ error: 'Tema não encontrado' }, { status: 404 })
        return NextResponse.json({ success: true, tema: rows[0] })
      }
      const { rows } = await pool.query(
        `INSERT INTO public.temas (tenant_id, nome) VALUES ($1, $2) RETURNING id, nome`,
        [tenantId, nome],
      )
      return NextResponse.json({ success: true, tema: rows[0] })
    } catch (e: any) {
      if (e.code === '23505') {
        return NextResponse.json({ error: 'Já existe um tema com esse nome.' }, { status: 409 })
      }
      throw e
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DESATIVAR tema (soft). Leads que já usam o tema continuam apontando para ele,
// mas o tema deixa de aparecer para escolha nos novos cadastros e nos filtros.
export async function DELETE(request: NextRequest) {
  try {
    const user = getCurrentUser(request)
    if (!user?.tenantId && !user?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 })

    const tenantId = user.is_system_role ? (searchParams.get('tenant_id') || user.tenantId) : user.tenantId

    const { rows } = await pool.query(
      `UPDATE public.temas SET ativo = false, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND ativo = true RETURNING id`,
      [id, tenantId],
    )
    if (rows.length === 0) return NextResponse.json({ error: 'Tema não encontrado' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
