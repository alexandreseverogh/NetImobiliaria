import pool from '@/lib/database/connection'

/**
 * Linha do tempo de relacionamento do lead (tabela public.lead_timeline).
 *
 * Regra: a timeline guarda só REFERÊNCIAS. O detalhe de cada item é buscado na fonte correta:
 *  - 'mensageria_message' → mensageria.messages (só se o tenant tem o módulo Mensageria)
 *  - 'atividade'          → public.atividades_lead
 *
 * Sem Mensageria contratada, mensagens de WhatsApp NÃO são exibidas (decisão 2026-11-10).
 * Nada de catálogo hardcoded: o slug do módulo vem da tabela system_modules.
 */

export interface TimelineItem {
  tipo: 'mensageria_message' | 'atividade'
  id: string
  occurredAt: string
  direction?: 'inbound' | 'outbound'
  senderType?: string
  content?: string | null
  contentType?: string
  attachments?: { url: string; mimetype?: string; name?: string }[]
  descricao?: string
  tipoAtividadeId?: number
  tipoAtividade?: { nome: string; icone: string | null; cor: string | null } | null
  usuarioId?: string | null
  /** Aparência do tipo configurado pelo tenant para mensagens (Opção B). Null = padrão. */
  mensagemTipo?: { nome: string; icone: string | null; cor: string | null } | null
}

/** Tipo de atividade que o tenant escolheu para representar mensagens (ou null). */
async function getMensagemTipo(tenantId: string): Promise<{ nome: string; icone: string | null; cor: string | null } | null> {
  const { rows } = await pool.query(
    `SELECT ta.nome, ta.icone, ta.cor
       FROM public.tenants t
       JOIN public.tipos_atividade ta ON ta.id = t.tipo_atividade_mensagem_id
      WHERE t.id = $1::uuid AND ta.ativo = true
      LIMIT 1`,
    [tenantId],
  )
  return rows[0] ?? null
}

/** Verifica se o tenant tem o módulo Mensageria contratado (mesmo padrão de hasCrmModule). */
export async function hasMensageriaModule(tenantId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM public.tenant_modules tm
       JOIN public.system_modules sm ON sm.id = tm.module_id
      WHERE tm.tenant_id = $1::uuid AND sm.slug = 'mensageria' AND tm.is_enabled = true
      LIMIT 1`,
    [tenantId],
  )
  return rows.length > 0
}

/**
 * Monta a linha do tempo do lead: referências + detalhe de cada fonte, do mais recente ao
 * mais antigo. Mensagens só entram se o módulo Mensageria estiver contratado.
 */
export async function getLeadTimeline(tenantId: string, leadUuid: string): Promise<TimelineItem[]> {
  const withMessages = await hasMensageriaModule(tenantId)
  const mensagemTipo = withMessages ? await getMensagemTipo(tenantId) : null

  const { rows: refs } = await pool.query(
    `SELECT tipo_origem, origem_id, occurred_at
       FROM public.lead_timeline
      WHERE tenant_id = $1::uuid AND lead_uuid = $2::uuid
      ORDER BY occurred_at DESC
      LIMIT 200`,
    [tenantId, leadUuid],
  )

  const msgIds = refs.filter(r => r.tipo_origem === 'mensageria_message' && withMessages).map(r => r.origem_id)
  const atIds = refs.filter(r => r.tipo_origem === 'atividade').map(r => r.origem_id)

  const msgMap = new Map<string, any>()
  if (msgIds.length) {
    const { rows } = await pool.query(
      `SELECT id, direction, sender_type, content, content_type, attachments, created_at
         FROM mensageria.messages
        WHERE tenant_id = $1::uuid AND id = ANY($2::uuid[])`,
      [tenantId, msgIds],
    )
    rows.forEach(r => msgMap.set(r.id, r))
  }

  const atMap = new Map<string, any>()
  if (atIds.length) {
    const { rows } = await pool.query(
      `SELECT a.id, a.descricao, a.tipo_atividade_id, a.usuario_id, a.created_at,
              ta.nome AS tipo_nome, ta.icone AS tipo_icone, ta.cor AS tipo_cor
         FROM public.atividades_lead a
         LEFT JOIN public.tipos_atividade ta ON ta.id = a.tipo_atividade_id
        WHERE a.tenant_id = $1::uuid AND a.id = ANY($2::uuid[]) AND a.deleted_at IS NULL`,
      [tenantId, atIds],
    )
    rows.forEach(r => atMap.set(r.id, r))
  }

  const items: TimelineItem[] = []
  for (const r of refs) {
    if (r.tipo_origem === 'mensageria_message') {
      const m = msgMap.get(r.origem_id)
      if (!m) continue // sem Mensageria, ou mensagem apagada na fonte
      items.push({
        tipo: 'mensageria_message',
        id: r.origem_id,
        occurredAt: new Date(m.created_at).toISOString(),
        direction: m.direction,
        senderType: m.sender_type,
        content: m.content,
        contentType: m.content_type,
        attachments: m.attachments || [],
        mensagemTipo,
      })
    } else if (r.tipo_origem === 'atividade') {
      const a = atMap.get(r.origem_id)
      if (!a) continue // atividade removida (soft delete) na fonte
      items.push({
        tipo: 'atividade',
        id: r.origem_id,
        occurredAt: new Date(a.created_at).toISOString(),
        descricao: a.descricao,
        tipoAtividadeId: a.tipo_atividade_id,
        tipoAtividade: a.tipo_nome ? { nome: a.tipo_nome, icone: a.tipo_icone ?? null, cor: a.tipo_cor ?? null } : null,
        usuarioId: a.usuario_id,
      })
    }
  }
  return items
}
