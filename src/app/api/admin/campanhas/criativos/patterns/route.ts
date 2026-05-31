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

    const rows = await pool.query(
      `SELECT
        hook_type, is_ugc_style, angle, emotional_tone, is_corporate_style,
        ads_count, avg_ctr, avg_cpc, total_spend, avg_cpl, sample_ads
       FROM campanhasmarketingdigital.vw_creative_patterns
       WHERE tenant_id = $1::uuid
       ORDER BY avg_cpl ASC NULLS LAST, avg_ctr DESC NULLS LAST`,
      [tenantId]
    );

    return NextResponse.json({ patterns: rows.rows });
  } catch (err: any) {
    console.error('[patterns] erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
