import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { refreshNextBestAction } from '@/lib/crm/agents/nextBestActionService'
import { touchPendency } from '@/lib/crm/pendencia/pendencyState'

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

/**
 * CRM KANBAN MOVE API
 * Move um lead de uma coluna para outra no pipeline do Kanban.
 * Incremental: apenas atualiza a referência de coluna em leads_kanban.
 */

export async function POST(request: NextRequest) {
  try {
    const { lead_uuid, coluna_id, valor_venda, valor_venda_estimado } = await request.json()

    if (!lead_uuid || !coluna_id) {
      return NextResponse.json(
        { success: false, error: 'lead_uuid e coluna_id são obrigatórios.' },
        { status: 400 }
      )
    }

    // Achado real (roteiro de testes do CRM, 2026-08-09): esta rota nunca aceitava
    // valor_venda — não havia NENHUM jeito, pela UI, de registrar quanto valeu um negócio ao
    // movê-lo pra uma etapa de Ganho (o único lugar que já escrevia essa coluna era o form de
    // criação do lead, antes mesmo de o negócio existir). Opcional e sempre validado — nunca
    // confia em número negativo/NaN vindo do cliente.
    const hasValorVenda = valor_venda !== undefined && valor_venda !== null
    if (hasValorVenda && (typeof valor_venda !== 'number' || !Number.isFinite(valor_venda) || valor_venda < 0)) {
      return NextResponse.json(
        { success: false, error: 'valor_venda precisa ser um número não-negativo.' },
        { status: 400 }
      )
    }

    // Valor ESTIMADO (nunca confundido com valor_venda real) — capturado ao entrar numa etapa
    // marcada requer_valor_estimado. Mesma disciplina: opcional no servidor, a barreira real é
    // o modal no cliente (kanban/page.tsx) interceptando o move antes de chamar esta API.
    const hasValorEstimado = valor_venda_estimado !== undefined && valor_venda_estimado !== null
    if (hasValorEstimado && (typeof valor_venda_estimado !== 'number' || !Number.isFinite(valor_venda_estimado) || valor_venda_estimado < 0)) {
      return NextResponse.json(
        { success: false, error: 'valor_venda_estimado precisa ser um número não-negativo.' },
        { status: 400 }
      )
    }

    const currentUser = getCurrentUser(request)
    const tenantId = currentUser?.tenantId || null
    const isMaster = currentUser?.is_system_role === true

    // Verificar se o lead existe e pertence ao tenant — já traz junto o is_ganho da coluna
    // ATUAL (LEFT JOIN, nunca quebra a checagem de "lead não encontrado" se o lead ainda não
    // tiver linha em leads_kanban) numa única consulta, em vez de uma 2ª query separada só
    // pra isso — cada round-trip a mais importa num pool de dev com poucas conexões (max=10).
    const leadCheck = await pool.query(
      `SELECT ls.lead_uuid, ls.tenant_id, ls.client_id, kc.is_ganho AS current_is_ganho
       FROM leads_staging ls
       LEFT JOIN leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
       LEFT JOIN kanban_colunas kc ON kc.id = lk.coluna_id
       WHERE ls.lead_uuid = $1 ${!isMaster ? 'AND ls.tenant_id = $2' : ''}`,
      !isMaster ? [lead_uuid, tenantId] : [lead_uuid]
    )
    if (leadCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lead não encontrado ou sem permissão.' },
        { status: 404 }
      )
    }

    const leadTenantId = leadCheck.rows[0].tenant_id
    const leadClientId = leadCheck.rows[0].client_id ?? null
    const wasGanho = leadCheck.rows[0].current_is_ganho === true

    // Verificar se a coluna destino existe e está ativa (no tenant correto)
    const colCheck = await pool.query(
      `SELECT id, nome, is_ganho FROM kanban_colunas WHERE id = $1 AND ativa = true ${!isMaster ? 'AND tenant_id = $2' : ''}`,
      !isMaster ? [coluna_id, tenantId] : [coluna_id]
    )
    if (colCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Coluna destino não encontrada ou inativa para este tenant.' },
        { status: 404 }
      )
    }

    // Achado real (2026-08-27): sair da etapa de Ganho pra QUALQUER outra (recuo, avanço, ou
    // indo direto pra Perda — que na ordem das colunas vem DEPOIS de Fechamento) nunca zerava
    // valor_venda — o negócio reaberto continuava mostrando "Valor Fechado" com o valor antigo,
    // como se ainda estivesse ganho. A regra é sobre SAIR do Ganho, não sobre a direção do
    // move, então checa direto is_ganho da coluna atual (já veio junto do leadCheck acima) ×
    // da coluna destino, sem depender de "recuar"/"avançar". Nunca confia em valor_venda vindo
    // do cliente pra decidir isso — a única fonte confiável é o estado real das 2 colunas.
    const targetIsGanho = colCheck.rows[0].is_ganho === true
    const leavingGanho = wasGanho && !targetIsGanho

    // Mover o lead (UPSERT para segurança)
    await pool.query(
      `INSERT INTO leads_kanban (lead_uuid, coluna_id, tenant_id, data_movimentacao) 
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (lead_uuid) 
       DO UPDATE SET coluna_id = $2, tenant_id = $3, data_movimentacao = NOW()`,
      [lead_uuid, coluna_id, leadTenantId]
    )

    // Atualizar status do lead na staging para refletir o estágio (+ valor_venda/
    // valor_venda_estimado, se vieram — nunca no mesmo campo, nunca a mesma coisa).
    const colNome = colCheck.rows[0].nome
    const setParts = ['status = $1', 'updated_at = NOW()']
    const updateParams: any[] = [colNome]
    if (leavingGanho) {
      // Zera o valor real de fechamento — negócio reaberto não é mais um negócio ganho.
      // Nunca no mesmo branch de hasValorVenda: esta condição sempre vence, mesmo que por
      // algum motivo um valor_venda tenha vindo no body (não deveria, mas o servidor não
      // confia nisso).
      setParts.push('valor_venda = NULL')
    } else if (hasValorVenda) {
      updateParams.push(valor_venda)
      setParts.push(`valor_venda = $${updateParams.length}`)
    }
    if (hasValorEstimado) {
      updateParams.push(valor_venda_estimado)
      setParts.push(`valor_venda_estimado = $${updateParams.length}`)
    }
    updateParams.push(lead_uuid)
    await pool.query(
      `UPDATE leads_staging SET ${setParts.join(', ')} WHERE lead_uuid = $${updateParams.length}`,
      updateParams
    )

    console.log(`[KanbanMove] Lead ${lead_uuid} movido para coluna ${colNome} (id: ${coluna_id})`)

    // F3 — Next Best Action (docs/PLANO_AGENTES_ACELERACAO_CRM.md §6): trigger ON_STAGE_CHANGE.
    // Best-effort, nunca bloqueia a resposta do move nem falha o move se o agente/LLM falhar —
    // mesma disciplina de notifyWhatsApp/notifySlack usada pelos agentes de scan (F1/F2). Se o
    // agente estiver desativado pra este tenant/segmento, refreshNextBestAction() já retorna
    // sem chamar LLM nenhuma (checa `ativo` internamente).
    refreshNextBestAction(leadTenantId, lead_uuid, leadClientId).catch((err) => {
      console.warn('[KanbanMove] Falha ao gerar Próxima Ação Sugerida (não bloqueante):', err)
    })

    // G0 — mover para etapa terminal (is_ganho/is_perda) ZERA a pendência de atendimento:
    // negócio ganho ou perdido não é lead abandonado. Awaited de propósito (diferente do
    // best-effort acima): sem isso, um lead recém-fechado continuaria sendo escalado pelo
    // motor de pendência até a reconciliação noturna corrigir.
    await touchPendency(lead_uuid).catch((err) => {
      console.warn('[KanbanMove] Falha ao atualizar pendência de atendimento:', err)
    })

    return NextResponse.json({
      success: true,
      message: `Lead movido para "${colCheck.rows[0].nome}" com sucesso.`
    })

  } catch (error: any) {
    console.error('❌ [KanbanMove] Erro:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
