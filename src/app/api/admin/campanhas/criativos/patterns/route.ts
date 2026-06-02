/**
 * GET /api/admin/campanhas/criativos/patterns
 * FASE 6 — Retorna padrões de criativos × performance (view vw_creative_patterns).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const { tenantId } = payload;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const conditions: string[] = ['tenant_id = $1::uuid'];
    const params: unknown[] = [tenantId];

    if (clientId === 'own') {
      conditions.push('client_id IS NULL');
    } else if (clientId) {
      params.push(clientId);
      conditions.push(`client_id = $${params.length}::uuid`);
    }

    const rows = await pool.query(
      `SELECT
        hook_type, is_ugc_style, angle, emotional_tone, is_corporate_style,
        ads_count, avg_ctr, avg_cpc, total_spend, avg_cpl, sample_ads
       FROM campanhasmarketingdigital.vw_creative_patterns
       WHERE ${conditions.join(' AND ')}
       ORDER BY avg_cpl ASC NULLS LAST, avg_ctr DESC NULLS LAST`,
      params
    );

    return NextResponse.json({ patterns: rows.rows });
  } catch (err: any) {
    console.error('[patterns] erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
