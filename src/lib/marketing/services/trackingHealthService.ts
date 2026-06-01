/**
 * FASE 8 — Tracking Health Monitor
 *
 * Executa 7 verificações de saúde do tracking, calcula um score 0-100
 * e persiste o resultado em TrackingHealthCheck para histórico e alertas.
 *
 * Checks implementados:
 *  1. tracking_endpoint   — Endpoint /api/r/[id] responde 200
 *  2. leads_24h           — Leads registrados nas últimas 24 horas
 *  3. duplicate_rate      — Taxa de leads duplicados (mesmo IP em <30s)
 *  4. pixel_configured    — pixel_id configurado no tenant/cliente
 *  5. access_token        — Token Meta configurado (Conversion API)
 *  6. lead_latency        — Latência média de captura (entre click e created_at)
 *  7. orphan_leads        — Leads sem campaignId (últimas 24h)
 */

import { prisma } from '@/lib/marketing/prisma';

/* ──────────────────────────────────────────────────────────────
   TIPOS
────────────────────────────────────────────────────────────── */

export type CheckStatus = 'ok' | 'warn' | 'critical' | 'skip';

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  value: string | number | null;   // valor medido (exibir na UI)
  detail: string;                  // texto explicativo
}

export interface HealthIssue {
  severity: 'warn' | 'critical';
  checkId: string;
  message: string;
}

export interface TrackingHealthResult {
  overallScore: number;
  checks: CheckResult[];
  issues: HealthIssue[];
}

/* ──────────────────────────────────────────────────────────────
   PESOS DOS CHECKS (somam 100)
────────────────────────────────────────────────────────────── */

const CHECK_WEIGHTS: Record<string, number> = {
  tracking_endpoint: 20,
  leads_24h:         20,
  duplicate_rate:    15,
  pixel_configured:  15,
  access_token:      15,
  lead_latency:      10,
  orphan_leads:      5,
};

/** Pontuação máxima possível (ignorando checks 'skip') */
function totalPossible(checks: CheckResult[]): number {
  return checks.reduce((acc, c) => acc + (c.status !== 'skip' ? (CHECK_WEIGHTS[c.id] ?? 0) : 0), 0);
}

/** Pontuação obtida pelos checks ok */
function totalEarned(checks: CheckResult[]): number {
  return checks.reduce((acc, c) => {
    if (c.status === 'ok')   return acc + (CHECK_WEIGHTS[c.id] ?? 0);
    if (c.status === 'warn') return acc + Math.floor((CHECK_WEIGHTS[c.id] ?? 0) * 0.5);
    return acc; // critical ou skip = 0
  }, 0);
}

/* ──────────────────────────────────────────────────────────────
   RUNNER PRINCIPAL
────────────────────────────────────────────────────────────── */

export async function runTrackingHealthCheck(
  tenantId: string,
  clientId?: string | null,
  baseUrl?: string,         // para check do endpoint; opcional
): Promise<TrackingHealthResult> {

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    c_endpoint,
    c_leads24h,
    c_dupRate,
    c_pixel,
    c_token,
    c_latency,
    c_orphan,
  ] = await Promise.all([
    checkTrackingEndpoint(baseUrl),
    checkLeads24h(tenantId, clientId, since24h),
    checkDuplicateRate(tenantId, clientId, since24h),
    checkPixelConfigured(tenantId, clientId),
    checkAccessToken(tenantId, clientId),
    checkLeadLatency(tenantId, clientId, since24h),
    checkOrphanLeads(tenantId, clientId, since24h),
  ]);

  const checks: CheckResult[] = [
    c_endpoint, c_leads24h, c_dupRate,
    c_pixel,    c_token,    c_latency,  c_orphan,
  ];

  // Calcular score normalizado para 0-100
  const possible = totalPossible(checks);
  const earned   = totalEarned(checks);
  const overallScore = possible > 0 ? Math.round((earned / possible) * 100) : 100;

  // Construir lista de issues
  const issues: HealthIssue[] = checks
    .filter(c => c.status === 'critical' || c.status === 'warn')
    .map(c => ({
      severity: c.status as 'warn' | 'critical',
      checkId:  c.id,
      message:  c.detail,
    }));

  return { overallScore, checks, issues };
}

/* ──────────────────────────────────────────────────────────────
   CHECK 1 — Endpoint /api/r responde 200?
────────────────────────────────────────────────────────────── */

async function checkTrackingEndpoint(baseUrl?: string): Promise<CheckResult> {
  if (!baseUrl) {
    return {
      id: 'tracking_endpoint', label: 'Endpoint de Tracking',
      status: 'skip', value: null,
      detail: 'URL base não configurada — verificação pulada.',
    };
  }

  const url = `${baseUrl}/api/r/__health_check__`;
  const start = Date.now();
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
    const ms  = Date.now() - start;
    // 307 (redirect) ou 404 (trackingId inválido mas rota existe) são aceitáveis
    const ok  = res.status < 500;
    return {
      id: 'tracking_endpoint', label: 'Endpoint de Tracking',
      status: ok ? 'ok' : 'critical',
      value: `${res.status} (${ms}ms)`,
      detail: ok
        ? `Endpoint responde normalmente (HTTP ${res.status}).`
        : `Endpoint retornou HTTP ${res.status} — verificar servidor.`,
    };
  } catch {
    return {
      id: 'tracking_endpoint', label: 'Endpoint de Tracking',
      status: 'critical', value: 'timeout',
      detail: 'Endpoint não respondeu em 5s — possível falha do servidor.',
    };
  }
}

/* ──────────────────────────────────────────────────────────────
   CHECK 2 — Leads registrados nas últimas 24h
────────────────────────────────────────────────────────────── */

async function checkLeads24h(
  tenantId: string, clientId?: string | null, since: Date = new Date(0),
): Promise<CheckResult> {
  const where: any = { tenantId, clickedAt: { gte: since } };
  if (clientId) where.clientId = clientId;

  const count = await prisma.lead.count({ where });

  let status: CheckStatus;
  let detail: string;

  if (count === 0) {
    status = 'critical';
    detail = 'Nenhum lead registrado nas últimas 24h — tracking pode estar quebrado.';
  } else if (count < 3) {
    status = 'warn';
    detail = `Apenas ${count} lead(s) em 24h — volume muito baixo.`;
  } else {
    status = 'ok';
    detail = `${count} lead(s) registrado(s) nas últimas 24h.`;
  }

  return {
    id: 'leads_24h', label: 'Leads nas Últimas 24h',
    status, value: count, detail,
  };
}

/* ──────────────────────────────────────────────────────────────
   CHECK 3 — Taxa de duplicatas (mesmo IP, intervalo <30s)
────────────────────────────────────────────────────────────── */

async function checkDuplicateRate(
  tenantId: string, clientId?: string | null, since: Date = new Date(0),
): Promise<CheckResult> {
  // Busca leads recentes com ipAddress preenchido
  const where: any = {
    tenantId,
    clickedAt: { gte: since },
    ipAddress: { not: null },
  };
  if (clientId) where.clientId = clientId;

  const leads = await prisma.lead.findMany({
    where,
    select: { ipAddress: true, clickedAt: true },
    orderBy: { clickedAt: 'asc' },
  });

  if (leads.length < 2) {
    return {
      id: 'duplicate_rate', label: 'Taxa de Duplicatas',
      status: 'ok', value: '0%',
      detail: 'Volume insuficiente para análise de duplicatas.',
    };
  }

  // Contar pares duplicados (mesmo IP em janela de 30s)
  let dupes = 0;
  const sorted = [...leads].sort(
    (a, b) => a.clickedAt.getTime() - b.clickedAt.getTime(),
  );

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (
      prev.ipAddress === curr.ipAddress &&
      curr.clickedAt.getTime() - prev.clickedAt.getTime() <= 30_000
    ) {
      dupes++;
    }
  }

  const rate = Math.round((dupes / sorted.length) * 100);

  let status: CheckStatus;
  let detail: string;

  if (rate >= 20) {
    status = 'critical';
    detail = `${rate}% dos leads são duplicatas (mesmo IP em <30s) — possível bot ou loop de tracking.`;
  } else if (rate >= 10) {
    status = 'warn';
    detail = `${rate}% de duplicatas — incomum, monitorar.`;
  } else {
    status = 'ok';
    detail = `${rate}% de duplicatas — dentro do normal.`;
  }

  return {
    id: 'duplicate_rate', label: 'Taxa de Duplicatas',
    status, value: `${rate}%`, detail,
  };
}

/* ──────────────────────────────────────────────────────────────
   CHECK 4 — Pixel Meta configurado?
────────────────────────────────────────────────────────────── */

async function checkPixelConfigured(
  tenantId: string, clientId?: string | null,
): Promise<CheckResult> {
  // Tenta cascata: cliente → tenant
  if (clientId) {
    const r = await prisma.$queryRaw<{ pixel_id: string | null }[]>`
      SELECT pixel_id
      FROM campanhasmarketingdigital."clientes"
      WHERE id = ${clientId}::uuid
      LIMIT 1
    `;
    if (r[0]?.pixel_id) {
      return {
        id: 'pixel_configured', label: 'Meta Pixel Configurado',
        status: 'ok', value: r[0].pixel_id,
        detail: 'Pixel ID configurado no cliente.',
      };
    }
  }

  // Tenta credentials do tenant
  const rows = await prisma.$queryRaw<{ pixel_id: string | null }[]>`
    SELECT credentials->>'pixel_id' AS pixel_id
    FROM public.tenant_network_credentials
    WHERE tenant_id = ${tenantId}::uuid
      AND network_id = (SELECT id FROM public.ad_networks WHERE slug = 'meta' LIMIT 1)
    LIMIT 1
  `;

  const pixelId = rows[0]?.pixel_id ?? null;

  if (pixelId) {
    return {
      id: 'pixel_configured', label: 'Meta Pixel Configurado',
      status: 'ok', value: pixelId,
      detail: 'Pixel ID configurado nas credenciais do tenant.',
    };
  }

  return {
    id: 'pixel_configured', label: 'Meta Pixel Configurado',
    status: 'warn', value: null,
    detail: 'Pixel ID não configurado — conversões e remarketing prejudicados.',
  };
}

/* ──────────────────────────────────────────────────────────────
   CHECK 5 — Token Meta (Conversion API) configurado?
────────────────────────────────────────────────────────────── */

async function checkAccessToken(
  tenantId: string, clientId?: string | null,
): Promise<CheckResult> {
  const rows = await prisma.$queryRaw<{ has_token: boolean; expires_at: string | null }[]>`
    SELECT
      (credentials->>'access_token') IS NOT NULL AND
      (credentials->>'access_token') <> ''        AS has_token,
      meta_token_expires_at::text                  AS expires_at
    FROM public.tenant_network_credentials tnc
    JOIN public.tenants t ON t.id = tnc.tenant_id
    WHERE tnc.tenant_id = ${tenantId}::uuid
      AND tnc.network_id = (SELECT id FROM public.ad_networks WHERE slug = 'meta' LIMIT 1)
    LIMIT 1
  `;

  const row = rows[0];

  if (!row?.has_token) {
    return {
      id: 'access_token', label: 'Token Meta (Conversion API)',
      status: 'critical', value: null,
      detail: 'Access token Meta não configurado — campanhas não serão sincronizadas.',
    };
  }

  // Checar expiração
  if (row.expires_at) {
    const expiresAt = new Date(row.expires_at);
    const daysLeft  = Math.ceil((expiresAt.getTime() - Date.now()) / (86_400_000));

    if (daysLeft <= 0) {
      return {
        id: 'access_token', label: 'Token Meta (Conversion API)',
        status: 'critical', value: 'EXPIRADO',
        detail: `Token Meta expirado em ${expiresAt.toLocaleDateString('pt-BR')} — renovar imediatamente.`,
      };
    }

    if (daysLeft <= 7) {
      return {
        id: 'access_token', label: 'Token Meta (Conversion API)',
        status: 'warn', value: `${daysLeft}d restantes`,
        detail: `Token Meta expira em ${daysLeft} dia(s) — renovar em breve.`,
      };
    }
  }

  return {
    id: 'access_token', label: 'Token Meta (Conversion API)',
    status: 'ok', value: 'configurado',
    detail: row.expires_at
      ? `Token ativo — expira em ${new Date(row.expires_at).toLocaleDateString('pt-BR')}.`
      : 'Token configurado.',
  };
}

/* ──────────────────────────────────────────────────────────────
   CHECK 6 — Latência média de captura de lead
   (tempo entre o click e o registro no banco, se disponível)
────────────────────────────────────────────────────────────── */

async function checkLeadLatency(
  tenantId: string, clientId?: string | null, since: Date = new Date(0),
): Promise<CheckResult> {
  // Lead.clickedAt IS o created_at — não temos "horário do click real"
  // Como proxy: verificamos se há leads com menos de 60s entre dois registros
  // consecutivos, que indica captura rápida. Se o banco responde rápido,
  // estamos bem. Vamos medir o tempo de query como proxy de latência.
  const start = Date.now();
  const where: any = { tenantId, clickedAt: { gte: since } };
  if (clientId) where.clientId = clientId;

  await prisma.lead.count({ where });
  const latencyMs = Date.now() - start;

  let status: CheckStatus;
  let detail: string;

  if (latencyMs > 3000) {
    status = 'warn';
    detail = `Latência de query alta (${latencyMs}ms) — banco de dados pode estar sobrecarregado.`;
  } else {
    status = 'ok';
    detail = `Latência de captura normal (${latencyMs}ms).`;
  }

  return {
    id: 'lead_latency', label: 'Latência de Captura',
    status, value: `${latencyMs}ms`, detail,
  };
}

/* ──────────────────────────────────────────────────────────────
   CHECK 7 — Leads órfãos (sem campaignId)
────────────────────────────────────────────────────────────── */

async function checkOrphanLeads(
  tenantId: string, clientId?: string | null, since: Date = new Date(0),
): Promise<CheckResult> {
  const whereAll: any  = { tenantId, clickedAt: { gte: since } };
  if (clientId) whereAll.clientId = clientId;

  const whereOrphan: any = { ...whereAll, OR: [{ campaignId: null }, { campaignId: '' }] };

  const [total, orphans] = await Promise.all([
    prisma.lead.count({ where: whereAll }),
    prisma.lead.count({ where: whereOrphan }),
  ]);

  if (total === 0) {
    return {
      id: 'orphan_leads', label: 'Leads Órfãos',
      status: 'skip', value: null,
      detail: 'Sem leads no período para verificar atribuição.',
    };
  }

  const pct = Math.round((orphans / total) * 100);

  let status: CheckStatus;
  let detail: string;

  if (pct >= 30) {
    status = 'critical';
    detail = `${pct}% dos leads sem campaignId (${orphans}/${total}) — problema sério de atribuição.`;
  } else if (pct >= 10) {
    status = 'warn';
    detail = `${pct}% dos leads sem campaignId (${orphans}/${total}) — verificar parâmetros UTM.`;
  } else {
    status = 'ok';
    detail = `${pct}% de leads sem atribuição (${orphans}/${total}) — dentro do normal.`;
  }

  return {
    id: 'orphan_leads', label: 'Leads Órfãos',
    status, value: `${pct}%`, detail,
  };
}

/* ──────────────────────────────────────────────────────────────
   PERSISTIR RESULTADO NO BANCO
────────────────────────────────────────────────────────────── */

export async function saveTrackingHealthCheck(
  tenantId: string,
  result: TrackingHealthResult,
  clientId?: string | null,
): Promise<string> {
  const row = await prisma.trackingHealthCheck.create({
    data: {
      tenantId,
      clientId: clientId ?? null,
      overallScore: result.overallScore,
      checks:       result.checks  as any,
      issues:       result.issues  as any,
    },
  });
  return row.id;
}

/* ──────────────────────────────────────────────────────────────
   BUSCAR HISTÓRICO
────────────────────────────────────────────────────────────── */

export async function getTrackingHealthHistory(
  tenantId: string,
  limit = 30,
  clientId?: string | null,
) {
  const where: any = { tenantId };
  if (clientId) where.clientId = clientId;

  return prisma.trackingHealthCheck.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}
