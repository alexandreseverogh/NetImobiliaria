import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/settings/client-creatives
// Retorna todos os clientes do tenant com seu creativesPath (se configurado)
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT
         c.uuid            AS id,
         c.nome            AS name,
         c.email,
         ccp.creatives_path AS "creativesPath"
       FROM public.clientes c
       LEFT JOIN campanhasmarketingdigital."ClientCreativesPath" ccp
         ON ccp.client_id = c.uuid AND ccp.tenant_id = $1::uuid
       WHERE c.tenant_id = $1::uuid
       ORDER BY c.nome ASC`,
      [payload.tenantId]
    );

    return NextResponse.json({ clients: result.rows });
  } catch (error: any) {
    console.error('GET /settings/client-creatives error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar clientes' }, { status: 500 });
  }
}

// PUT /api/admin/campanhas/settings/client-creatives
// Body: { clientId: string, creativesPath: string }
export async function PUT(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, creativesPath } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO campanhasmarketingdigital."ClientCreativesPath"
         (id, tenant_id, client_id, creatives_path)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3)
       ON CONFLICT (tenant_id, client_id) DO UPDATE SET
         creatives_path = EXCLUDED.creatives_path,
         updated_at     = NOW()`,
      [payload.tenantId, clientId, creativesPath ?? '']
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /settings/client-creatives error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar' }, { status: 500 });
  }
}
