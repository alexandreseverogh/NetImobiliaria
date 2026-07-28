import axios from 'axios';
import prisma from '../prisma';

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL || '';
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'http://localhost:3001';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'trafegopago';

export async function notifySlack(message: string, tenantId?: string | null) {
  let webhook = SLACK_WEBHOOK;
  if (tenantId) {
    const config = await prisma.$queryRaw<{ slack_webhook_url: string | null }[]>`
      SELECT slack_webhook_url FROM public.tenants WHERE id = ${tenantId}::uuid LIMIT 1
    `;
    if (config[0]?.slack_webhook_url) {
      webhook = config[0].slack_webhook_url;
    }
  }

  if (!webhook) return;
  try {
    await axios.post(webhook, { text: message });
  } catch (err) {
    console.error('Slack notify error:', err);
  }
}

function normalizePhone(raw: string): string {
  let phone = raw.replace(/\D/g, '');
  // BR mobile: 55 + 2-digit DDD + 9-digit = 13 digits; Evolution API expects 12 (drop the 9th digit)
  if (phone.length === 13 && phone.startsWith('55')) {
    phone = phone.slice(0, 4) + phone.slice(5);
  }
  return phone;
}

export async function notifyWhatsApp(message: string, tenantId?: string | null) {
  let apiUrl = EVOLUTION_API_URL;
  let apiKey = EVOLUTION_API_KEY;
  let instance = EVOLUTION_INSTANCE;
  let phoneNumber = '';

  if (tenantId) {
    const row = await prisma.$queryRaw<{
      evolution_api_url: string | null;
      evolution_api_key: string | null;
      evolution_instance: string | null;
      numero_whatsapp: string | null;
    }[]>`
      SELECT evolution_api_url, evolution_api_key, evolution_instance, numero_whatsapp
      FROM public.tenants WHERE id = ${tenantId}::uuid LIMIT 1
    `;
    const cfg = row[0];
    if (cfg?.evolution_api_url)  apiUrl = cfg.evolution_api_url;
    if (cfg?.evolution_api_key)  apiKey = cfg.evolution_api_key;
    if (cfg?.evolution_instance) instance = cfg.evolution_instance;

    // numero_whatsapp tem prioridade sobre WhatsAppConfig
    if (cfg?.numero_whatsapp) {
      phoneNumber = normalizePhone(cfg.numero_whatsapp);
    }
  }

  // Fallback: WhatsAppConfig legacy
  if (!phoneNumber) {
    const config = await prisma.whatsAppConfig.findFirst({
      where: tenantId ? { tenantId, isDefault: true } : { isDefault: true },
    });
    if (config?.phoneNumber) {
      phoneNumber = normalizePhone(config.phoneNumber);
    }
  }

  if (!apiUrl || !apiKey || !phoneNumber) return;

  try {
    await axios.post(
      `${apiUrl}/message/sendText/${instance}`,
      { number: phoneNumber, text: message, linkPreview: false },
      { headers: { 'Content-Type': 'application/json', apikey: apiKey } },
    );
  } catch (err: any) {
    console.error('Evolution API notify error:', err.response?.data || err.message);
  }
}

export async function getEvolutionStatus(tenantId?: string | null): Promise<{
  connected: boolean;
  instance: string;
  error?: string;
}> {
  let apiUrl = EVOLUTION_API_URL;
  let apiKey = EVOLUTION_API_KEY;
  let instance = EVOLUTION_INSTANCE;

  if (tenantId) {
    const config = await prisma.$queryRaw<{
      evolution_api_url: string | null;
      evolution_api_key: string | null;
      evolution_instance: string | null;
    }[]>`
      SELECT evolution_api_url, evolution_api_key, evolution_instance
      FROM public.tenants WHERE id = ${tenantId}::uuid LIMIT 1
    `;
    const cfg = config[0];
    if (cfg?.evolution_api_url)  apiUrl = cfg.evolution_api_url;
    if (cfg?.evolution_api_key)  apiKey = cfg.evolution_api_key;
    if (cfg?.evolution_instance) instance = cfg.evolution_instance;
  }

  if (!apiUrl || !apiKey) {
    return { connected: false, instance, error: 'Evolution API nao configurada' };
  }

  try {
    const res = await axios.get(
      `${apiUrl}/instance/connectionState/${instance}`,
      { headers: { apikey: apiKey } }
    );
    const state = res.data?.instance?.state || res.data?.state;
    return {
      connected: state === 'open',
      instance,
      error: state !== 'open' ? `Estado: ${state}` : undefined,
    };
  } catch (err: any) {
    return {
      connected: false,
      instance,
      error: err.response?.data?.message || err.message,
    };
  }
}

// Resolve nome do tenant e nome do cliente (via campanha) para exibir nas mensagens
async function resolveNames(
  tenantId?: string | null,
  campaignId?: string | null,
): Promise<{ tenantName: string; clientName: string }> {
  let tenantName = '';
  let clientName = '';

  if (tenantId) {
    const rows = await prisma.$queryRaw<{ name: string }[]>`
      SELECT name FROM public.tenants WHERE id = ${tenantId}::uuid LIMIT 1
    `.catch(() => []);
    tenantName = rows[0]?.name ?? '';
  }

  if (campaignId) {
    const rows = await prisma.$queryRaw<{ client_name: string }[]>`
      SELECT cl.name AS client_name
      FROM public.campaigns c
      JOIN public.clients cl ON cl.id = c.client_id
      WHERE c.id = ${campaignId}::uuid LIMIT 1
    `.catch(() => []);
    clientName = rows[0]?.client_name ?? '';
  }

  return { tenantName, clientName };
}

// budget é armazenado em CENTAVOS (Meta) — divide por 100 para exibir em reais
const fmtBRL = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 2 });

export async function notifyApprovalRequired(action: {
  id: string;
  campaignId?: string | null;
  campaignName: string;
  title: string;
  description: string;
  confidence: number;
  type?: string | null;
  tenantId?: string | null;
  approvalPin?: string | null;
  budget?: { current: number; proposed: number; pct: number } | null;
}) {
  const approveUrl = `${PUBLIC_DOMAIN}/api/agent/approve/${action.id}`;
  const rejectUrl  = `${PUBLIC_DOMAIN}/api/agent/reject/${action.id}`;

  const { tenantName, clientName } = await resolveNames(action.tenantId, action.campaignId);
  const clientLine = clientName
    ? `👤 Cliente: ${clientName}${tenantName ? ` (${tenantName})` : ''}\n`
    : tenantName
    ? `🏢 Tenant: ${tenantName}\n`
    : '';

  const pinLine = action.approvalPin
    ? `🔐 PIN de confirmação: *${action.approvalPin}*\n   (válido por 24h — não compartilhe)\n\n`
    : '';

  const orcamentoLine = action.budget
    ? `💰 Orçamento diário: ${fmtBRL(action.budget.current)} → *${fmtBRL(action.budget.proposed)}* ` +
      `(${action.budget.pct >= 0 ? '+' : ''}${action.budget.pct.toFixed(0)}%)\n`
    : '';

  // Link para a UI de lançamento/investimento (apenas para SCALE)
  const investLink = action.type === 'SCALE'
    ? `\n📲 Painel de investimentos: ${PUBLIC_DOMAIN}/admin/campanhas/aprovacoes\n`
    : '';

  const message =
    `🤖 *Agente Trafego Pago — Aprovação Necessária*\n\n` +
    clientLine +
    `📊 Campanha: ${action.campaignName}\n` +
    `💡 ${action.title}\n` +
    `📝 ${action.description}\n` +
    orcamentoLine +
    `🎯 Confiança: ${(action.confidence * 100).toFixed(0)}%\n\n` +
    pinLine +
    `✅ Aprovar: ${approveUrl}\n` +
    `❌ Rejeitar: ${rejectUrl}` +
    investLink;

  await Promise.allSettled([
    notifySlack(message, action.tenantId),
    notifyWhatsApp(message, action.tenantId),
  ]);
}

const ACTION_EMOJI: Record<string, string> = {
  PAUSE:             '⏸️',
  DOWNSCALE:         '📉',
  SCALE:             '📈',
  REFRESH_CREATIVE:  '🎨',
  ADJUST_AUDIENCE:   '🎯',
  REALLOCATE_BUDGET: '💰',
};

const ACTION_LABEL: Record<string, string> = {
  PAUSE:             'Campanha pausada',
  DOWNSCALE:         'Orçamento reduzido',
  SCALE:             'Orçamento escalado',
  REFRESH_CREATIVE:  'Criativo atualizado',
  ADJUST_AUDIENCE:   'Público ajustado',
  REALLOCATE_BUDGET: 'Orçamento realocado',
};

export async function notifyExecuted(
  action: {
    campaignId?: string | null;
    campaignName: string;
    title: string;
    description?: string;
    type: string;
    tenantId?: string | null;
    budget?: { before: number; after: number } | null;
  },
  auto = true,
) {
  const emoji = ACTION_EMOJI[action.type] ?? '⚡';
  const actionLabel = ACTION_LABEL[action.type] ?? 'Ação executada';
  const header = auto
    ? `${emoji} *Agente — ${actionLabel} automaticamente*`
    : `${emoji} *Agente — ${actionLabel} (aprovado por você)*`;

  const { tenantName, clientName } = await resolveNames(action.tenantId, action.campaignId);
  const clientLine = clientName
    ? `👤 Cliente: ${clientName}${tenantName ? ` (${tenantName})` : ''}\n`
    : tenantName
    ? `🏢 Tenant: ${tenantName}\n`
    : '';

  const orcamentoLine = action.budget
    ? `\n💰 Orçamento diário: ${fmtBRL(action.budget.before)} → *${fmtBRL(action.budget.after)}*`
    : '';

  const message =
    `${header}\n\n` +
    clientLine +
    `📊 Campanha: ${action.campaignName}\n` +
    `⚡ Ação: ${action.title}` +
    orcamentoLine +
    (action.description ? `\n📝 ${action.description}` : '');

  await Promise.allSettled([
    notifySlack(message, action.tenantId),
    notifyWhatsApp(message, action.tenantId),
  ]);
}

// ── Digest consolidado — uma mensagem por tick cobrindo todos os clientes ────
export interface DigestItem {
  type: string;
  campaignName: string;
  clientName: string;
  actionId: string;
  description: string;
  // PARTE D3 — código da rede (meta/google/tiktok...) resolvido via ad_networks pelo chamador.
  // Só vira rótulo visível na mensagem quando o ciclo mistura mais de uma rede (ver notifyDigest).
  network?: string | null;
  pin?: string | null;
  budget?: {
    current?: number;
    proposed?: number;
    before?: number;
    after?: number;
    pct?: number;
  } | null;
  pauseBudget?: number | null;   // budget diário (centavos) da campanha pausada — para cálculo financeiro
  approveUrl?: string;
  rejectUrl?: string;
}

// Rótulo do grupo "sem cliente" (campanhas próprias do tenant)
const OWN_GROUP = '__own__';

// PARTE D3 — rótulo curto por rede, usado no "Resumo do Ciclo" só quando o ciclo mistura
// mais de uma rede (ver hasMultiNetwork em notifyDigest). Sem multi-rede, nenhuma linha muda.
const NETWORK_TAG: Record<string, string> = { meta: 'Meta', google: 'Google', tiktok: 'TikTok', linkedin: 'LinkedIn' };
const networkTag = (network: string | null | undefined) => `[${NETWORK_TAG[network ?? 'meta'] ?? 'Meta'}] `;

export async function notifyDigest(tenantId: string, items: DigestItem[]) {
  if (items.length === 0) return;

  const { tenantName } = await resolveNames(tenantId);

  // Agrupa por cliente; campanhas próprias (clientName vazio) vão para OWN_GROUP
  const byClient = new Map<string, DigestItem[]>();
  for (const it of items) {
    const key = it.clientName?.trim() || OWN_GROUP;
    if (!byClient.has(key)) byClient.set(key, []);
    byClient.get(key)!.push(it);
  }

  // Ordena clientes alfabeticamente; próprias por último
  const clientKeys = Array.from(byClient.keys()).sort((a, b) => {
    if (a === OWN_GROUP) return 1;
    if (b === OWN_GROUP) return -1;
    return a.localeCompare(b, 'pt-BR');
  });

  const tenantLine = tenantName ? ` — ${tenantName}` : '';
  let hasApprovals = false; // SCALE ou REALLOCATE_BUDGET — qualquer ação que exija PIN/painel

  // PARTE D3 — com Google (e futuramente TikTok) no ar, uma ação "escalar" do Google e uma do
  // Meta apareciam misturadas no mesmo resumo sem dizer de qual rede — reduzia a clareza da
  // decisão no celular. Só rotula rede quando o ciclo de fato mistura mais de uma; ciclo
  // mono-rede (a maioria dos tenants hoje) continua idêntico a antes.
  const hasMultiNetwork = new Set(items.map(i => i.network ?? 'meta')).size > 1;

  // Monta um bloco de texto por cliente. WhatsApp mobile não renderiza balões
  // muito longos (>~3000 chars somem na tela), então enviamos 1 mensagem por cliente.
  const blocks: string[] = [];

  for (const key of clientKeys) {
    const group = byClient.get(key)!;
    const scales      = group.filter(i => i.type === 'SCALE');
    const pauses      = group.filter(i => i.type === 'PAUSE');
    const downscales  = group.filter(i => i.type === 'DOWNSCALE');
    const reallocs    = group.filter(i => i.type === 'REALLOCATE_BUDGET');
    const others      = group.filter(i => !['SCALE', 'PAUSE', 'DOWNSCALE', 'REALLOCATE_BUDGET'].includes(i.type));
    if (scales.length > 0 || reallocs.length > 0) hasApprovals = true;

    // Cabeçalho compacto — cada bloco é auto-contido (chega como mensagem separada)
    let b = `🤖 *Resumo do Ciclo*${tenantLine}\n`;
    b += key === OWN_GROUP
      ? `🏢 *Campanhas próprias*\n`
      : `👤 *${key}*\n`;
    b += `--------------------\n`;

    // 📈 Escalas (precisam de aprovação)
    for (const s of scales) {
      b += `📈 ${hasMultiNetwork ? networkTag(s.network) : ''}*${s.campaignName}*\n`;
      if (s.budget?.current != null && s.budget?.proposed != null) {
        b += `   💰 ${fmtBRL(s.budget.current)} -> *${fmtBRL(s.budget.proposed)}*`;
        if (s.budget.pct != null) b += ` (+${s.budget.pct.toFixed(0)}%)`;
        b += '\n';
      }
      if (s.pin) b += `   🔐 PIN: *${s.pin}*\n`;
      if (s.approveUrl) b += `   ✅ ${s.approveUrl}\n`;
      if (s.rejectUrl)  b += `   ❌ ${s.rejectUrl}\n`;
    }

    // ⏸️ Pausadas automaticamente
    for (const p of pauses) {
      b += `⏸️ ${hasMultiNetwork ? networkTag(p.network) : ''}${p.campaignName}`;
      if (p.pauseBudget != null) b += `  (${fmtBRL(p.pauseBudget)}/dia)`;
      b += '\n';
      if (p.description) b += `   ${p.description}\n`;
    }

    // 📉 Orçamento reduzido
    for (const d of downscales) {
      b += `📉 ${hasMultiNetwork ? networkTag(d.network) : ''}${d.campaignName}\n`;
      if (d.budget?.before != null && d.budget?.after != null) {
        b += `   💰 ${fmtBRL(d.budget.before)} -> ${fmtBRL(d.budget.after)}\n`;
      }
    }

    // 💰 Realocações cross-rede (precisam de aprovação — docs/PLANO_TIKTOK.md §8.4). Já vem
    // com as 2 redes rotuladas dentro de description (não cabe no networkTag de 1 rede só).
    for (const r of reallocs) {
      b += `💰 *${r.campaignName}*\n`;
      if (r.description) b += `   ${r.description}\n`;
      if (r.pin) b += `   🔐 PIN: *${r.pin}*\n`;
      if (r.approveUrl) b += `   ✅ ${r.approveUrl}\n`;
      if (r.rejectUrl)  b += `   ❌ ${r.rejectUrl}\n`;
    }

    // ⚡ Outras ações
    for (const o of others) {
      b += `⚡ ${hasMultiNetwork ? networkTag(o.network) : ''}${o.campaignName}\n`;
      if (o.description) b += `   ${o.description}\n`;
    }

    // 💰 Resumo financeiro do ciclo por cliente
    const scaleDelta = scales.reduce((sum, s) => {
      if (s.budget?.current != null && s.budget?.proposed != null) {
        return sum + (s.budget.proposed - s.budget.current);
      }
      return sum;
    }, 0);
    const pauseSavings = pauses.reduce((sum, p) => sum + (p.pauseBudget ?? 0), 0);
    const downscaleSavings = downscales.reduce((sum, d) => {
      if (d.budget?.before != null && d.budget?.after != null) {
        return sum + (d.budget.before - d.budget.after);
      }
      return sum;
    }, 0);
    const totalSavings = pauseSavings + downscaleSavings;
    const net = totalSavings - scaleDelta;

    if (scaleDelta > 0 || totalSavings > 0) {
      b += `--------------------\n`;
      b += `💰 *Impacto financeiro (diário)*\n`;
      if (pauseSavings > 0)    b += `   ⏸️ Economia pausas:  ${fmtBRL(pauseSavings)}/dia\n`;
      if (downscaleSavings > 0) b += `   📉 Economia redução: ${fmtBRL(downscaleSavings)}/dia\n`;
      if (scaleDelta > 0)      b += `   📈 Incremento scale: +${fmtBRL(scaleDelta)}/dia\n`;
      if (net >= 0) {
        b += `   ✅ Auto-financiado (+${fmtBRL(net)}/dia de sobra)\n`;
      } else {
        b += `   ⚠️ Aporte necessário: +${fmtBRL(Math.abs(net))}/dia\n`;
      }
    }

    blocks.push(b);
  }

  const panelLine = hasApprovals
    ? `📲 Aprovar no painel: ${process.env.PUBLIC_DOMAIN || 'http://localhost:3001'}/admin/campanhas/aprovacoes`
    : '';

  // Slack: mensagem única consolidada (Slack lida bem com texto longo)
  const slackMsg = blocks.join('\n\n') + (panelLine ? `\n\n${panelLine}` : '');
  await notifySlack(slackMsg, tenantId);

  // WhatsApp: uma mensagem por cliente, em sequência (preserva a ordem na tela)
  for (const b of blocks) {
    await notifyWhatsApp(b, tenantId);
  }
  if (panelLine) {
    await notifyWhatsApp(panelLine, tenantId);
  }
}

export async function notifyAlert(action: {
  campaignId?: string | null;
  campaignName: string;
  title: string;
  description: string;
  confidence: number;
  tenantId?: string | null;
}) {
  const { tenantName, clientName } = await resolveNames(action.tenantId, action.campaignId);
  const clientLine = clientName
    ? `👤 Cliente: ${clientName}${tenantName ? ` (${tenantName})` : ''}\n`
    : tenantName
    ? `🏢 Tenant: ${tenantName}\n`
    : '';

  const message =
    `⚠️ *Alerta de Campanha*\n\n` +
    clientLine +
    `📊 Campanha: ${action.campaignName}\n` +
    `💡 ${action.title}\n` +
    `📝 ${action.description}\n` +
    `🎯 Confiança: ${(action.confidence * 100).toFixed(0)}%`;

  await Promise.allSettled([
    notifySlack(message, action.tenantId),
    notifyWhatsApp(message, action.tenantId),
  ]);
}
