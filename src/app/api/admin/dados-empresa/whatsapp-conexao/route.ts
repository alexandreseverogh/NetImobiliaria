/**
 * GET/POST /api/admin/dados-empresa/whatsapp-conexao
 *
 * Status da conexão WhatsApp (Evolution) da PRÓPRIA empresa e QR Code para parear o celular.
 * Mesma lógica da rota do Master (/api/admin/master/tenants/[id]/whatsapp), mas com escopo do
 * tenant do token e permissão `dados-empresa`. Quem parea é o administrador da empresa.
 */
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireAnyApiPermission } from '@/lib/auth/apiPermissions';
import { getEvolutionStatus } from '@/lib/marketing/services/agentNotificador';

export const dynamic = 'force-dynamic';

const RESOURCE = 'dados-empresa';

async function getEvoCfg(tenantId: string) {
  const { rows } = await pool.query(
    `SELECT evolution_api_url, evolution_api_key, evolution_instance
     FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [tenantId],
  );
  return rows[0] ?? null;
}

async function fetchQr(tenantId: string): Promise<{ qrCode: string | null; error?: string }> {
  const cfg = await getEvoCfg(tenantId);
  if (!cfg?.evolution_api_url || !cfg?.evolution_api_key || !cfg?.evolution_instance) {
    return { qrCode: null, error: 'Conexão Evolution não configurada (URL, chave e instância).' };
  }
  try {
    const res = await axios.get(
      `${cfg.evolution_api_url}/instance/connect/${cfg.evolution_instance}`,
      { headers: { apikey: cfg.evolution_api_key }, timeout: 10000 },
    );
    return { qrCode: res.data?.base64 ?? res.data?.code ?? null };
  } catch (err: any) {
    return { qrCode: null, error: err.response?.data?.message || err.message };
  }
}

export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const denied = await requireAnyApiPermission(request, [RESOURCE], 'READ');
  if (denied) return denied;

  const status = await getEvolutionStatus(payload.tenantId);
  let qrCode: string | null = null;
  let qrError: string | undefined;
  if (!status.connected) {
    const qr = await fetchQr(payload.tenantId);
    qrCode = qr.qrCode;
    qrError = qr.error;
  }
  return NextResponse.json({ ...status, qrCode, qrError });
}

export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const denied = await requireAnyApiPermission(request, [RESOURCE], 'UPDATE');
  if (denied) return denied;

  const qr = await fetchQr(payload.tenantId);
  if (qr.error && !qr.qrCode) {
    return NextResponse.json({ error: qr.error }, { status: 400 });
  }
  return NextResponse.json({ qrCode: qr.qrCode, connected: !qr.qrCode });
}
