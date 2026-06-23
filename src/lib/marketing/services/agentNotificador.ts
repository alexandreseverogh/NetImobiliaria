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

export async function notifyWhatsApp(message: string, tenantId?: string | null) {
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

  if (!apiUrl || !apiKey) return;

  // Busca config do tenant específico, ou a default global
  const config = await prisma.whatsAppConfig.findFirst({
    where: tenantId ? { tenantId, isDefault: true } : { isDefault: true },
  });
  if (!config?.phoneNumber) return;

  let phone = config.phoneNumber.replace(/\D/g, '');
  // BR mobile: 55 + 2-digit DDD + 9-digit number = 13 digits; Evolution API expects 12 (drop the extra 9)
  if (phone.length === 13 && phone.startsWith('55')) {
    phone = phone.slice(0, 4) + phone.slice(5);
  }

  try {
    await axios.post(
      `${apiUrl}/message/sendText/${instance}`,
      {
        number: phone,
        text: message,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: apiKey,
        },
      }
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

export async function notifyApprovalRequired(action: {
  id: string;
  campaignName: string;
  title: string;
  description: string;
  confidence: number;
  tenantId?: string | null;
  approvalPin?: string | null;
}) {
  const approveUrl = `${PUBLIC_DOMAIN}/api/agent/approve/${action.id}`;
  const rejectUrl  = `${PUBLIC_DOMAIN}/api/agent/reject/${action.id}`;

  const pinLine = action.approvalPin
    ? `🔐 PIN de confirmação: *${action.approvalPin}*\n   (válido por 24h — não compartilhe)\n\n`
    : '';

  const message =
    `🤖 *Agente Trafego Pago — Aprovação Necessária*\n\n` +
    `📊 Campanha: ${action.campaignName}\n` +
    `💡 ${action.title}\n` +
    `📝 ${action.description}\n` +
    `🎯 Confiança: ${(action.confidence * 100).toFixed(0)}%\n\n` +
    pinLine +
    `✅ Aprovar: ${approveUrl}\n` +
    `❌ Rejeitar: ${rejectUrl}`;

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

export async function notifyExecuted(action: {
  campaignName: string;
  title: string;
  type: string;
  tenantId?: string | null;
}) {
  const emoji = ACTION_EMOJI[action.type] ?? '⚡';
  const label = action.type === 'DOWNSCALE' ? 'Budget reduzido automaticamente' : 'Ação executada automaticamente';
  const message =
    `${emoji} *Agente — ${label}*\n\n` +
    `📊 Campanha: ${action.campaignName}\n` +
    `✅ ${action.title}`;

  await Promise.allSettled([
    notifySlack(message, action.tenantId),
    notifyWhatsApp(message, action.tenantId),
  ]);
}

export async function notifyAlert(action: {
  campaignName: string;
  title: string;
  description: string;
  confidence: number;
  tenantId?: string | null;
}) {
  const message =
    `⚠️ *Alerta de Campanha*\n\n` +
    `📊 Campanha: ${action.campaignName}\n` +
    `💡 ${action.title}\n` +
    `📝 ${action.description}\n` +
    `🎯 Confiança: ${(action.confidence * 100).toFixed(0)}%`;

  await Promise.allSettled([
    notifySlack(message, action.tenantId),
    notifyWhatsApp(message, action.tenantId),
  ]);
}
