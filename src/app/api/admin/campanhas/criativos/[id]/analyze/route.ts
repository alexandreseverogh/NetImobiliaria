/**
 * POST /api/admin/campanhas/criativos/[id]/analyze
 * FASE 6 — Re-aciona análise Vision LLM para um asset específico.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';
import { analyzeCreativeAsset } from '@/lib/marketing/services/creativeAnalysisService';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const assetId = params.id;

    // Verificar que o asset pertence ao tenant
    const res = await pool.query(
      `SELECT id FROM campanhasmarketingdigital."CreativeAsset"
       WHERE id = $1 AND tenant_id = $2::uuid`,
      [assetId, payload.tenantId]
    );
    if (!res.rows.length) {
      return NextResponse.json({ error: 'Asset não encontrado' }, { status: 404 });
    }

    // Disparar análise (pode ser síncrono ou assíncrono via query param)
    const sync = new URL(request.url).searchParams.get('sync') === 'true';
    if (sync) {
      await analyzeCreativeAsset(assetId);
      return NextResponse.json({ success: true, message: 'Análise concluída' });
    } else {
      analyzeCreativeAsset(assetId).catch(e =>
        console.error('[analyze] falhou:', e.message)
      );
      return NextResponse.json({ success: true, message: 'Análise em andamento' });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
