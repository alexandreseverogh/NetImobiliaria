import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { hasCrmModule } from '@/lib/marketing/services/revenueAttributionService';

/**
 * GET /api/admin/campanhas/temas-disponiveis
 * Diz ao wizard de campanha se o campo de tema deve ser exibido (módulo de CRM contratado)
 * e devolve os temas ativos do tenant logado.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const crmContracted = await hasCrmModule(payload.tenantId);
  if (!crmContracted) {
    return NextResponse.json({ success: true, crmContracted: false, temas: [] });
  }

  const { rows } = await pool.query(
    'SELECT id, nome FROM public.temas WHERE tenant_id = $1 AND ativo = true ORDER BY nome ASC',
    [payload.tenantId],
  );
  return NextResponse.json({ success: true, crmContracted: true, temas: rows });
}
