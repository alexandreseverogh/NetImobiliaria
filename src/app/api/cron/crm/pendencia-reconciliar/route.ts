import { NextRequest, NextResponse } from 'next/server'
import { reconcilePendency } from '@/lib/crm/pendencia/pendencyState'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/crm/pendencia-reconciliar
 *
 * Rede de segurança do estado "de quem é a bola" (docs/PLANO_PENDENCIA_ATENDIMENTO.md §5).
 * Recomputa a pendência de TODA a base a partir das fontes reais e corrige divergências.
 *
 * O caminho normal é a materialização na escrita (touchPendency em ingest.ts, atividades,
 * criação de lead, movimentação de etapa) — rápido e suficiente em 99% dos casos. Este job
 * existe porque a corretude não pode depender de eu ter lembrado de todo call site: mesmo
 * princípio que fez leadEvents.ts virar fonte única.
 *
 * O campo `corrigidos` na resposta é diagnóstico, não só métrica: valor consistentemente
 * diferente de zero significa que ALGUM caminho de escrita não está chamando touchPendency() —
 * é exatamente o que esta rede existe pra revelar.
 *
 * Diário, 03:00 (registrado em scripts/feed-cron-scheduler.js).
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const inicio = Date.now()
  try {
    const { corrigidos } = await reconcilePendency()
    return NextResponse.json({ success: true, corrigidos, elapsedMs: Date.now() - inicio })
  } catch (error: any) {
    console.error('[cron/pendencia-reconciliar] falhou:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
