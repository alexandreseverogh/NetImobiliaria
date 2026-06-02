import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/campanhas/audit-monthly
 * FASE 9 — Gera relatório mensal de auditoria para todos os tenants e seus clientes.
 *
 * Agendamento: 1º dia do mês às 09:00 (cron: "0 9 1 * *")
 * Protegido por CRON_SECRET.
 *
 * Gera um AuditReport (30 dias) para cada combinação:
 *   - (tenant, null)      → relatório da própria empresa
 *   - (tenant, clientId)  → relatório de cada cliente com campanhas ativas
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const { getActiveTenants } = await import('@/lib/marketing/services/agentMonitor');
    const { generateAuditReport, saveAuditReport } = await import(
      '@/lib/marketing/services/auditReportService'
    );
    const { prisma } = await import('@/lib/marketing/prisma');

    const tenantIds = await getActiveTenants();

    let totalReports = 0;
    let succeeded    = 0;
    let failed       = 0;

    // Processa cada tenant em paralelo
    const tenantResults = await Promise.allSettled(
      tenantIds.map(async (tenantId) => {
        // 1. Busca clientIds com campanhas ativas no tenant
        const clientRows = await prisma.campaign.findMany({
          where:  { tenantId, clientId: { not: null } },
          select: { clientId: true },
          distinct: ['clientId'],
        });
        const clientIds: (string | null)[] = [
          null,                                     // própria empresa
          ...clientRows.map(r => r.clientId!),      // cada cliente
        ];

        // 2. Gera relatório para cada combinação (tenant, client)
        const reportResults = await Promise.allSettled(
          clientIds.map(async (clientId) => {
            const report = await generateAuditReport(
              tenantId,
              clientId,
              30,    // período: 30 dias (mensal)
              false, // withNarrative: false por padrão no cron (evita timeout; pode ser ativado via env)
            );
            await saveAuditReport(report);
            return { tenantId, clientId };
          })
        );

        const ok  = reportResults.filter(r => r.status === 'fulfilled').length;
        const err = reportResults.filter(r => r.status === 'rejected').length;

        // Log erros individuais sem quebrar o tenant
        reportResults.forEach((r, i) => {
          if (r.status === 'rejected') {
            console.error(
              `[audit-monthly] Erro tenant=${tenantId} clientId=${clientIds[i]}:`,
              r.reason,
            );
          }
        });

        return { tenantId, reports: clientIds.length, ok, err };
      })
    );

    // Consolida resultados
    tenantResults.forEach(r => {
      if (r.status === 'fulfilled') {
        totalReports += r.value.reports;
        succeeded    += r.value.ok;
        failed       += r.value.err;
      } else {
        console.error('[audit-monthly] Erro de tenant:', r.reason);
        failed++;
      }
    });

    const elapsed = Date.now() - startedAt;
    console.log(
      `[audit-monthly] tenants=${tenantIds.length} reports=${totalReports} ok=${succeeded} err=${failed} ${elapsed}ms`,
    );

    return NextResponse.json({
      ok: true,
      period: 30,
      tenants:      tenantIds.length,
      totalReports,
      succeeded,
      failed,
      elapsedMs: elapsed,
    });
  } catch (error: any) {
    console.error('POST /cron/campanhas/audit-monthly error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
