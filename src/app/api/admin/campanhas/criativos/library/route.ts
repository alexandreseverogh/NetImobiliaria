/**
 * GET /api/admin/campanhas/criativos/library
 * FASE 6 — Lista CreativeAssets do tenant com análise joinada.
 *
 * Query params:
 *   hookType?, angle?, isUgc?, hasProperty?, status?, clientId?, limit?, offset?
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

    const hookType   = searchParams.get('hookType');
    const angle      = searchParams.get('angle');
    const isUgc      = searchParams.get('isUgc');
    const hasProp    = searchParams.get('hasProperty');
    const status     = searchParams.get('status');   // pending|running|done|failed
    const clientId   = searchParams.get('clientId');
    const limit      = Math.min(parseInt(searchParams.get('limit')  || '60'), 200);
    const offset     = parseInt(searchParams.get('offset') || '0');

    const conditions: string[] = [`a.tenant_id = $1::uuid`, `a.is_active = true`];
    const values: any[]        = [tenantId];
    let idx = 2;

    if (hookType)  { conditions.push(`an.hook_type = $${idx++}`);        values.push(hookType); }
    if (angle)     { conditions.push(`an.angle = $${idx++}`);             values.push(angle); }
    if (isUgc === 'true')  { conditions.push(`an.is_ugc_style = true`); }
    if (isUgc === 'false') { conditions.push(`an.is_ugc_style = false`); }
    if (hasProp === 'true')  { conditions.push(`an.has_property = true`); }
    if (hasProp === 'false') { conditions.push(`an.has_property = false`); }
    if (status)             { conditions.push(`an.analysis_status = $${idx++}`);  values.push(status); }
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (clientId === 'own') { conditions.push(`a.client_id IS NULL`); }
    else if (clientId && UUID_RE.test(clientId)) { conditions.push(`a.client_id = $${idx++}::uuid`); values.push(clientId); }
    // clientId não-UUID (ex: 'segment') é ignorado — sem filtro por client_id

    const where = conditions.join(' AND ');

    const sql = `
      SELECT
        a.id, a.original_name, a.storage_url, a.file_size, a.mime_type,
        a.campaign_id, a.ad_id, a.uploaded_at, a.ai_generated,
        an.analysis_status,
        an.hook_type, an.angle, an.emotional_tone, an.cta_style,
        an.has_people, an.has_property, an.has_text_overlay,
        an.is_ugc_style, an.is_corporate_style,
        an.scene_description, an.key_visual_elements,
        an.llm_confidence, an.error_message,
        an.has_emoji, an.has_price, an.has_urgency_words
      FROM campanhasmarketingdigital."CreativeAsset" a
      LEFT JOIN campanhasmarketingdigital."CreativeAnalysis" an ON an.asset_id = a.id
      WHERE ${where}
      ORDER BY a.uploaded_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    values.push(limit, offset);

    const countSql = `
      SELECT COUNT(*) AS total
      FROM campanhasmarketingdigital."CreativeAsset" a
      LEFT JOIN campanhasmarketingdigital."CreativeAnalysis" an ON an.asset_id = a.id
      WHERE ${where}
    `;

    const [rows, countRes] = await Promise.all([
      pool.query(sql, values),
      pool.query(countSql, values.slice(0, -2)),
    ]);

    return NextResponse.json({
      assets: rows.rows,
      total: parseInt(countRes.rows[0]?.total || '0'),
      limit,
      offset,
    });
  } catch (err: any) {
    console.error('[criativos/library] erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
