import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import axios from 'axios';
import pool from '@/lib/database/connection';
import { getEvolutionStatus } from '@/lib/marketing/services/agentNotificador';

async function getTenantEvoCfg(id: string) {
  const row = await pool.query(
    `SELECT evolution_api_url, evolution_api_key, evolution_instance
     FROM public.tenants WHERE id = $1 LIMIT 1`,
    [id],
  );
  return row.rows[0] ?? null;
}

// GET — status de conexão + QR code (se desconectado)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const status = await getEvolutionStatus(params.id);
  let qrCode: string | null = null;

  if (!status.connected) {
    const cfg = await getTenantEvoCfg(params.id);
    if (cfg?.evolution_api_url && cfg?.evolution_api_key) {
      const instance = cfg.evolution_instance || 'trafegopago';
      try {
        const res = await axios.get(
          `${cfg.evolution_api_url}/instance/connect/${instance}`,
          { headers: { apikey: cfg.evolution_api_key }, timeout: 10000 },
        );
        qrCode = res.data?.base64 ?? res.data?.code ?? null;
      } catch (err: any) {
        console.error('[whatsapp/qr] erro ao buscar QR:', err.response?.data || err.message);
      }
    }
  }

  return NextResponse.json({ ...status, qrCode });
}

// POST — refresh_qr: obtém novo QR code
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { action } = await request.json();

  if (action === 'refresh_qr') {
    const cfg = await getTenantEvoCfg(params.id);
    if (!cfg?.evolution_api_url || !cfg?.evolution_api_key) {
      return NextResponse.json({ error: 'Evolution API não configurada para este tenant' }, { status: 400 });
    }
    const instance = cfg.evolution_instance || 'trafegopago';
    try {
      const res = await axios.get(
        `${cfg.evolution_api_url}/instance/connect/${instance}`,
        { headers: { apikey: cfg.evolution_api_key }, timeout: 10000 },
      );
      const qrCode = res.data?.base64 ?? res.data?.code ?? null;
      const connected = !qrCode;
      return NextResponse.json({ qrCode, connected });
    } catch (err: any) {
      return NextResponse.json(
        { error: err.response?.data?.message || err.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
}
