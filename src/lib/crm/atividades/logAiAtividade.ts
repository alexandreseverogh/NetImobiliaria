import pool from '@/lib/database/connection'

/**
 * Registro de atividade autoral da IA — a mesma trilha visível em "Atividades" na ficha do
 * lead do Kanban, agora também para respostas que a plataforma envia sozinha (reativação
 * automática G6, resposta do chatbot M4.1). Ver migration-2026-08-09-atividades-origem-ia.sql.
 *
 * Best-effort de propósito: uma falha aqui (ex.: tenant sem o tipo "Resposta Automática (IA)",
 * caso raro de um tenant novo ainda não migrado) NUNCA pode derrubar o envio real da mensagem
 * que já aconteceu — só perdemos o registro de auditoria, não o efeito real no lead.
 *
 * Deliberadamente NÃO chama touchPendency() aqui: tanto a reativação quanto o bot já enviam a
 * mensagem via ingestMessage() (mensageria), que já dispara esse gancho — duplicar a chamada
 * aqui só arriscaria os dois caminhos divergirem com o tempo.
 */
export async function logAiAtividade(params: {
  leadUuid: string
  tenantId: string
  clientId: string | null
  descricao: string
}): Promise<void> {
  const { leadUuid, tenantId, clientId, descricao } = params
  const texto = (descricao || '').trim()
  if (!texto) return

  try {
    const [leadRes, tipoRes] = await Promise.all([
      pool.query(
        `SELECT lk.coluna_id FROM public.leads_kanban lk WHERE lk.lead_uuid = $1::uuid`,
        [leadUuid],
      ),
      // Mesma cascata cliente > tenant já usada em GET /api/crm/atividades/tipos.
      pool.query(
        `SELECT id FROM public.tipos_atividade
          WHERE tenant_id = $1::uuid AND nome = 'Resposta Automática (IA)' AND ativo = true
            AND ($2::uuid IS NULL OR client_id = $2::uuid OR client_id IS NULL)
          ORDER BY client_id NULLS LAST
          LIMIT 1`,
        [tenantId, clientId],
      ),
    ])

    const tipoId = tipoRes.rows[0]?.id
    if (!tipoId) {
      console.error(`[logAiAtividade] tenant ${tenantId} sem o tipo "Resposta Automática (IA)" — atividade não registrada.`)
      return
    }

    await pool.query(
      `INSERT INTO public.atividades_lead
         (lead_uuid, tipo_atividade_id, descricao, coluna_id, usuario_id, tenant_id, client_id, origem)
       VALUES ($1::uuid, $2, $3, $4, NULL, $5::uuid, $6, 'ia')`,
      [leadUuid, tipoId, texto.slice(0, 2000), leadRes.rows[0]?.coluna_id ?? null, tenantId, clientId],
    )
  } catch (err) {
    console.error('[logAiAtividade] falha ao registrar atividade da IA:', err)
  }
}
