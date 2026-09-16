import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import { CRM_AGENT_CATALOG } from '@/lib/crm/agents'

/**
 * CONFIGURAÇÃO DE AGENTES DE ACELERAÇÃO DO CRM — OVERRIDE DO TENANT (/crm/config/agentes)
 *
 * Espelha /crm/config/ia: o segmento é herdado via resolveSegment(tenantId, clientId), a
 * Master cura o PADRÃO por segmento (/admin/master/segments → "Agentes de Aceleração"), o
 * tenant só ajusta o PRÓPRIO override — sempre escopado ao seu tenant_id real, nunca escreve
 * na tabela de segmento. `ativo: null` no override significa "herdar o padrão do segmento",
 * mesma semântica já usada por resolveEffectiveAgentConfig() (src/lib/crm/agents/
 * effectiveConfig.ts) — esta rota só fecha o gap de UI que faltava pra esse mecanismo, que já
 * existia no banco desde F0.
 */

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

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const isMaster = currentUser.is_system_role === true

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const tenantId = isMaster ? (searchParams.get('tenant_id') || currentUser.tenantId) : currentUser.tenantId
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

    const segment = await resolveSegment(tenantId, clientId)
    if (!segment) {
      return NextResponse.json({ success: true, segment: null, catalog: CRM_AGENT_CATALOG, segmentDefaults: [], tenantOverrides: [] })
    }

    const [segmentRes, tenantRes] = await Promise.all([
      pool.query(
        `SELECT agent_key, ativo, params FROM public.crm_agentes_config_segmento WHERE segment_id = $1::uuid`,
        [segment.id],
      ),
      pool.query(
        `SELECT agent_key, ativo, params FROM public.crm_agentes_config_tenant WHERE tenant_id = $1::uuid`,
        [tenantId],
      ),
    ])

    return NextResponse.json({
      success: true,
      segment: { id: segment.id, name: segment.name, slug: segment.slug },
      catalog: CRM_AGENT_CATALOG,
      segmentDefaults: segmentRes.rows,
      tenantOverrides: tenantRes.rows,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const tenantId = currentUser.tenantId

    const body = await request.json()
    const agents = Array.isArray(body?.agents) ? body.agents : []
    const validKeys = new Set(CRM_AGENT_CATALOG.map((a) => a.key))

    for (const a of agents) {
      if (!validKeys.has(a?.agent_key)) {
        return NextResponse.json({ error: `Agente "${a?.agent_key}" não existe no catálogo.` }, { status: 400 })
      }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      for (const a of agents) {
        // ativo: null explícito = "herdar o padrão do segmento" (não é o mesmo que false =
        // "forçar desligado neste tenant mesmo que o segmento esteja ativo").
        const ativo = a.ativo === true ? true : a.ativo === false ? false : null
        await client.query(
          `INSERT INTO public.crm_agentes_config_tenant (tenant_id, agent_key, ativo, params, updated_at)
           VALUES ($1::uuid, $2, $3, $4::jsonb, now())
           ON CONFLICT (tenant_id, agent_key)
           DO UPDATE SET ativo = EXCLUDED.ativo, params = EXCLUDED.params, updated_at = now()`,
          [tenantId, a.agent_key, ativo, JSON.stringify(a.params ?? {})],
        )
      }
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    return NextResponse.json({ success: true, updated: agents.length })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
