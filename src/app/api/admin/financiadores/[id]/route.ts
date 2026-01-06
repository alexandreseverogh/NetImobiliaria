import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { findFinanciadorById, updateFinanciador, deleteFinanciador } from '@/lib/database/financiadores'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const id = parseInt(params.id, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const financiador = await findFinanciadorById(id)
    if (!financiador) return NextResponse.json({ error: 'Financiador não encontrado' }, { status: 404 })

    return NextResponse.json({ success: true, data: financiador })
  } catch (error) {
    console.error('Erro ao buscar financiador:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const id = parseInt(params.id, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    const body = await request.json()
    const patch: any = {}

    if (body?.nome !== undefined) patch.nome = String(body.nome || '').trim()
    if (body?.headline !== undefined) patch.headline = String(body.headline || '').trim()
    if (body?.valor_mensal !== undefined) patch.valor_mensal = Number(body.valor_mensal)
    if (body?.ativo !== undefined) patch.ativo = !!body.ativo

    if (body?.logo_base64 !== undefined) patch.logo_base64 = String(body.logo_base64 || '').trim()
    if (body?.logo_tipo_mime !== undefined) patch.logo_tipo_mime = String(body.logo_tipo_mime || '').trim()

    if (patch.nome !== undefined && !patch.nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }
    if (patch.headline !== undefined && !patch.headline) {
      return NextResponse.json({ error: 'Texto chamativo (headline) é obrigatório' }, { status: 400 })
    }
    if (patch.valor_mensal !== undefined && (!Number.isFinite(patch.valor_mensal) || patch.valor_mensal < 0)) {
      return NextResponse.json({ error: 'Valor mensal inválido' }, { status: 400 })
    }
    if (patch.logo_base64 !== undefined && patch.logo_base64.length > 6_000_000) {
      return NextResponse.json({ error: 'Logo muito grande. Reduza o tamanho do arquivo.' }, { status: 400 })
    }
    if (patch.logo_base64 !== undefined && !patch.logo_base64) {
      return NextResponse.json({ error: 'Logo inválida' }, { status: 400 })
    }
    if (patch.logo_tipo_mime !== undefined && !patch.logo_tipo_mime) {
      return NextResponse.json({ error: 'Tipo MIME da logo é obrigatório' }, { status: 400 })
    }

    const updated = await updateFinanciador(id, patch)
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Erro ao atualizar financiador:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const id = parseInt(params.id, 10)
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

    await deleteFinanciador(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.toLowerCase().includes('não encontrado')) {
      return NextResponse.json({ error: msg, success: false }, { status: 404 })
    }
    console.error('Erro ao excluir financiador:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}


