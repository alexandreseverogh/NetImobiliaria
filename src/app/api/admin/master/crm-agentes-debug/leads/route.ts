import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { requireMaster } from '@/lib/crm/agents/debugAuth'

/** Lista os leads de um tenant de teste, com o estado que os 5 agentes de fato leem — pra
 *  não precisar abrir o Kanban real em paralelo pra ver "de quem é a bola" e a qualificação. */
export async function GET(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const tenantId = request.nextUrl.searchParams.get('tenantId')
  if (!tenantId) return NextResponse.json({ error: 'tenantId obrigatório' }, { status: 400 })

  const { rows } = await pool.query(
    `SELECT ls.lead_uuid, ls.nome, ls.telefone, ls.bola_com, ls.bola_desde,
            ls.tag_sonho, ls.resumo_ia, ls.score_prontidao, ls.score_fit,
            kc.titulo_exibicao AS etapa_atual, kc.sla_hours,
            lkc.data_entrada AS etapa_desde,
            u.nome AS responsavel_nome
       FROM public.leads_staging ls
       LEFT JOIN public.leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
       LEFT JOIN public.kanban_colunas kc ON kc.id = lk.coluna_id
       LEFT JOIN public.leads_kanban_ciclos lkc
         ON lkc.lead_uuid = ls.lead_uuid AND lkc.coluna_id = lk.coluna_id AND lkc.data_saida IS NULL
       LEFT JOIN public.users u ON u.id = ls.corretor_atribuido_id
      WHERE ls.tenant_id = $1::uuid AND ls.deleted_at IS NULL
      ORDER BY ls.created_at DESC
      LIMIT 100`,
    [tenantId],
  )

  return NextResponse.json({ leads: rows })
}
