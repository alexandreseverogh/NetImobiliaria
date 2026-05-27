import axios from 'axios';
import prisma from '../prisma';

const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK_URL || '';
const PUBLIC_DOMAIN = process.env.PUBLIC_DOMAIN || 'http://localhost:3001';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || '';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'trafegopago';

export async function notifySlack(message: string) {
  if (!SLACK_WEBHOOK) return;
  try {
    await axios.post(SLACK_WEBHOOK, { text: message });
  } catch (err) {
    console.error('Slack notify error:', err);
  }
}

export async function notifyWhatsApp(message: string, tenantId?: string) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) return;

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
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        number: phone,
        text: message,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
      }
    );
  } catch (err: any) {
    console.error('Evolution API notify error:', err.response?.data || err.message);
  }
}

export async function getEvolutionStatus(): Promise<{
  connected: boolean;
  instance: string;
  error?: string;
}> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { connected: false, instance: EVOLUTION_INSTANCE, error: 'Evolution API nao configurada (EVOLUTION_API_URL / EVOLUTION_API_KEY)' };
  }

  try {
    const res = await axios.get(
      `${EVOLUTION_API_URL}/instance/connectionState/${EVOLUTION_INSTANCE}`,
      { headers: { apikey: EVOLUTION_API_KEY } }
    );
    const state = res.data?.instance?.state || res.data?.state;
    return {
      connected: state === 'open',
      instance: EVOLUTION_INSTANCE,
      error: state !== 'open' ? `Estado: ${state}` : undefined,
    };
  } catch (err: any) {
    return {
      connected: false,
      instance: EVOLUTION_INSTANCE,
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
}) {
  const approveUrl = `${PUBLIC_DOMAIN}/api/agent/approve/${action.id}`;
  const rejectUrl = `${PUBLIC_DOMAIN}/api/agent/reject/${action.id}`;

  const message =
    `🤖 *Agente Trafego Pago — Aprovação Necessária*\n\n` +
    `📊 Campanha: ${action.campaignName}\n` +
    `💡 ${action.title}\n` +
    `📝 ${action.description}\n` +
    `🎯 Confiança: ${(action.confidence * 100).toFixed(0)}%\n\n` +
    `✅ Aprovar: ${approveUrl}\n` +
    `❌ Rejeitar: ${rejectUrl}`;

  await Promise.allSettled([
    notifySlack(message),
    notifyWhatsApp(message),
  ]);
}

export async function notifyExecuted(action: {
  campaignName: string;
  title: string;
  type: string;
}) {
  const emoji = action.type === 'PAUSE' ? '⏸️' : '⚡';
  const message =
    `${emoji} *Agente executou ação automaticamente*\n\n` +
    `📊 Campanha: ${action.campaignName}\n` +
    `✅ Ação: ${action.title}`;

  await Promise.allSettled([
    notifySlack(message),
    notifyWhatsApp(message),
  ]);
}

export async function notifyAlert(action: {
  campaignName: string;
  title: string;
  description: string;
  confidence: number;
}) {
  const message =
    `⚠️ *Alerta de Campanha*\n\n` +
    `📊 Campanha: ${action.campaignName}\n` +
    `💡 ${action.title}\n` +
    `📝 ${action.description}\n` +
    `🎯 Confiança: ${(action.confidence * 100).toFixed(0)}%`;

  await Promise.allSettled([
    notifySlack(message),
    notifyWhatsApp(message),
  ]);
}
