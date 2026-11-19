/**
 * GET/PUT /api/admin/clientes/[id]/central-mensagens
 *
 * Configurações de mensagens do cliente (hoje: atualização da foto dos contatos). Existe só quando
 * o tenant do cliente tem a Mensageria contratada e "Gerar mensagens no WhatsApp" ligado.
 * Rota própria: o PUT de Meta (campaign-settings) regrava todos os seus campos, não pode ser reutilizado.
 */
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { isAvatarTtlEnabled } from '@/lib/mensageria/avatarService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const denied = await requireApiPermission(request, 'clientes', 'READ');
  if (denied) return denied;

  const { rows } = await pool.query(
    `SELECT avatar_ttl_days FROM public.clientes WHERE uuid = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
    [params.id, payload.tenantId],
  );
  if (!rows[0]) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });

  return NextResponse.json({
    enabled: await isAvatarTtlEnabled(payload.tenantId),
    avatarTtlDays: rows[0].avatar_ttl_days ?? null,
  });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const denied = await requireApiPermission(request, 'clientes', 'UPDATE');
  if (denied) return denied;

  if (!(await isAvatarTtlEnabled(payload.tenantId))) {
    return NextResponse.json({ error: 'Central de Mensagens não habilitada para esta empresa' }, { status: 400 });
  }

  const body = await request.json();
  let ttl: number | null = null;
  if (body.avatarTtlDays != null && body.avatarTtlDays !== '') {
    const n = Number(body.avatarTtlDays);
    if (!Number.isInteger(n) || n < 1 || n > 365) {
      return NextResponse.json({ error: 'Atualização da foto deve estar entre 1 e 365 dias' }, { status: 400 });
    }
    ttl = n;
  }

  const res = await pool.query(
    `UPDATE public.clientes SET avatar_ttl_days = $1, updated_at = NOW()
      WHERE uuid = $2::uuid AND tenant_id = $3::uuid RETURNING uuid`,
    [ttl, params.id, payload.tenantId],
  );
  if (res.rows.length === 0) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
  return NextResponse.json({ success: true, avatarTtlDays: ttl });
}
