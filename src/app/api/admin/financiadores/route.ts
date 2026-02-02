import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { safeParseInt } from '@/lib/utils/safeParser'
import { findFinanciadoresPaginated, createFinanciador } from '@/lib/database/financiadores'

export async function GET(request: NextRequest) {
  try {
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const { searchParams } = new URL(request.url)
    const page = safeParseInt(searchParams.get('page'), 1, 1)
    const limit = safeParseInt(searchParams.get('limit'), 10, 1, 100)
    const search = searchParams.get('search') || ''

    const result = await findFinanciadoresPaginated(page, limit, search)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar financiadores:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const body = await request.json()
    const nome = String(body?.nome || '').trim()
    const headline = String(body?.headline || '').trim()
    const valorMensal = Number(body?.valor_mensal)
    const ativo = body?.ativo !== undefined ? !!body.ativo : true
    const logoBase64 = String(body?.logo_base64 || '').trim()
    const logoTipoMime = String(body?.logo_tipo_mime || '').trim()

    if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    if (!headline) return NextResponse.json({ error: 'Texto chamativo (headline) é obrigatório' }, { status: 400 })
    if (!Number.isFinite(valorMensal) || valorMensal < 0) {
      return NextResponse.json({ error: 'Valor mensal inválido' }, { status: 400 })
    }
    if (!logoBase64) return NextResponse.json({ error: 'Logo é obrigatória' }, { status: 400 })
    if (!logoTipoMime) return NextResponse.json({ error: 'Tipo MIME da logo é obrigatório' }, { status: 400 })

    // Limite básico (evita payloads absurdos). Base64 ~ 4/3 do tamanho do arquivo.
    if (logoBase64.length > 6_000_000) {
      return NextResponse.json({ error: 'Logo muito grande. Reduza o tamanho do arquivo.' }, { status: 400 })
    }

    const created = await createFinanciador({
      nome,
      headline,
      valor_mensal: valorMensal,
      ativo,
      logo_base64: logoBase64,
      logo_tipo_mime: logoTipoMime
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar financiador:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}


