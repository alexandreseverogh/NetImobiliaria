import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import { resolvePromptTemplate } from '@/lib/intelligence/promptResolver'

/**
 * Override de PROMPT por tenant/cliente — cascata Cliente → Tenant → Segmento → Global
 * (docs/CHECKPOINT.md, 2026-08-28). Como cliente nunca loga na aplicação, quem cadastra o
 * override de um cliente é sempre o admin do TENANT, em nome dele — por isso não existe
 * autenticação de cliente aqui, só tenant (isMaster bypassa pra qualquer tenant, mesmo
 * padrão de /api/crm/config/ia).
 *
 * Rota genérica reaproveitada pelos 4 lugares reais onde um prompt de CRM/Mensageria já é
 * mostrado/configurado — nunca usada pelos templates de Campanhas (whitelist abaixo).
 */

const ALLOWED_TEMPLATE_KEYS = new Set([
  'crm_lead_qualification',
  'mensageria_bot_persona',
  'crm_agent_reactivation_message',
  'crm_agent_next_best_action',
])

function getCurrentUser(request: NextRequest): { userId: string; tenantId?: string; is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null
    return { userId: decoded.userId, tenantId: decoded.tenantId, is_system_role: decoded.is_system_role === true }
  } catch {
    return null
  }
}

function resolveTenantId(request: NextRequest, currentUser: { tenantId?: string; is_system_role?: boolean }, searchParams: URLSearchParams) {
  const isMaster = currentUser.is_system_role === true
  return isMaster ? (searchParams.get('tenant_id') || currentUser.tenantId || null) : (currentUser.tenantId || null)
}

export async function GET(request: NextRequest) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const templateKey = searchParams.get('templateKey')
  const clientId = searchParams.get('clientId') || null
  const tenantId = resolveTenantId(request, currentUser, searchParams)

  if (!templateKey || !ALLOWED_TEMPLATE_KEYS.has(templateKey)) {
    return NextResponse.json({ error: 'templateKey inválido.' }, { status: 400 })
  }
  if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

  try {
    const segment = await resolveSegment(tenantId, clientId)

    const [resolvedContent, clientRow, tenantRow, segmentRow] = await Promise.all([
      resolvePromptTemplate(templateKey, { segmentId: segment?.id ?? null, tenantId, clientId }),
      clientId
        ? pool.query(
            `SELECT content FROM public.system_prompt_templates
             WHERE template_key = $1 AND tenant_id = $2::uuid AND client_id = $3::uuid AND is_active = true LIMIT 1`,
            [templateKey, tenantId, clientId],
          )
        : Promise.resolve({ rows: [] as { content: string }[] }),
      pool.query(
        `SELECT content FROM public.system_prompt_templates
         WHERE template_key = $1 AND tenant_id = $2::uuid AND client_id IS NULL AND is_active = true LIMIT 1`,
        [templateKey, tenantId],
      ),
      // Achado real testando ao vivo: "o tenant TEM um segmento" não significa que EXISTE uma
      // linha de prompt curada pra esse segmento — precisa checar de verdade, senão todo
      // segmento sem template próprio (ex.: Venda de Carros, só Imobiliário e Global existem
      // hoje) aparecia erroneamente como "herdado do segmento" em vez de "herdado do global".
      segment?.id
        ? pool.query(
            `SELECT 1 FROM public.system_prompt_templates
             WHERE template_key = $1 AND segment_id = $2::uuid AND is_active = true LIMIT 1`,
            [templateKey, segment.id],
          )
        : Promise.resolve({ rows: [] as any[] }),
    ])

    // Nível efetivamente valendo agora — mesma ordem de resolvePromptTemplate, só pra exibir.
    let resolvedLevel: 'client' | 'tenant' | 'segment' | 'global' = 'global'
    if (clientId && clientRow.rows[0]) resolvedLevel = 'client'
    else if (tenantRow.rows[0]) resolvedLevel = 'tenant'
    else if (segmentRow.rows[0]) resolvedLevel = 'segment'

    const overrideContent = clientId ? (clientRow.rows[0]?.content ?? null) : (tenantRow.rows[0]?.content ?? null)

    return NextResponse.json({
      success: true,
      resolvedContent,
      resolvedLevel,
      overrideContent,
      editingLevel: clientId ? 'client' : 'tenant',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { templateKey, clientId, content } = body ?? {}
  const { searchParams } = new URL(request.url)
  const tenantId = resolveTenantId(request, currentUser, searchParams) || body?.tenantId

  if (!templateKey || !ALLOWED_TEMPLATE_KEYS.has(templateKey)) {
    return NextResponse.json({ error: 'templateKey inválido.' }, { status: 400 })
  }
  if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })
  if (typeof content !== 'string' || !content.trim()) {
    return NextResponse.json({ error: 'O texto do prompt não pode ficar vazio.' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Título de referência — puxa do template global (todo template_key sempre tem 1),
    // só pra manter a listagem legível caso algum dia o Master audite overrides via SQL.
    const titleRes = await client.query(
      `SELECT title FROM public.system_prompt_templates
       WHERE template_key = $1 AND segment_id IS NULL LIMIT 1`,
      [templateKey],
    )
    const title = titleRes.rows[0]?.title || templateKey

    if (clientId) {
      await client.query(
        `DELETE FROM public.system_prompt_templates
         WHERE template_key = $1 AND tenant_id = $2::uuid AND client_id = $3::uuid`,
        [templateKey, tenantId, clientId],
      )
      await client.query(
        `INSERT INTO public.system_prompt_templates
           (template_key, tenant_id, client_id, version, title, content, is_active)
         VALUES ($1, $2::uuid, $3::uuid, 1, $4, $5, true)`,
        [templateKey, tenantId, clientId, title, content],
      )
    } else {
      await client.query(
        `DELETE FROM public.system_prompt_templates
         WHERE template_key = $1 AND tenant_id = $2::uuid AND client_id IS NULL`,
        [templateKey, tenantId],
      )
      await client.query(
        `INSERT INTO public.system_prompt_templates
           (template_key, tenant_id, client_id, version, title, content, is_active)
         VALUES ($1, $2::uuid, NULL, 1, $3, $4, true)`,
        [templateKey, tenantId, title, content],
      )
    }

    await client.query('COMMIT')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    await client.query('ROLLBACK')
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function DELETE(request: NextRequest) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const templateKey = searchParams.get('templateKey')
  const clientId = searchParams.get('clientId') || null
  const tenantId = resolveTenantId(request, currentUser, searchParams)

  if (!templateKey || !ALLOWED_TEMPLATE_KEYS.has(templateKey)) {
    return NextResponse.json({ error: 'templateKey inválido.' }, { status: 400 })
  }
  if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

  try {
    if (clientId) {
      await pool.query(
        `DELETE FROM public.system_prompt_templates
         WHERE template_key = $1 AND tenant_id = $2::uuid AND client_id = $3::uuid`,
        [templateKey, tenantId, clientId],
      )
    } else {
      await pool.query(
        `DELETE FROM public.system_prompt_templates
         WHERE template_key = $1 AND tenant_id = $2::uuid AND client_id IS NULL`,
        [templateKey, tenantId],
      )
    }
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
