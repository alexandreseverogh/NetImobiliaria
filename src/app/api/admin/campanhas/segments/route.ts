import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

export interface SegmentOption {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  colorTheme: string | null;
  clientCount: number;
  campaignCount: number;  // campanhas com insights no período selecionado
  isOwn: boolean;         // segmento do próprio tenant
}

// GET /api/admin/campanhas/segments?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Retorna segmentos com campanhas que possuem dados (insights) no período.
// Segmentos sem nenhuma campanha ativa no período são omitidos.
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endDate   = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(endDate.getTime() - 30 * 86400000);

    const S = 'campanhasmarketingdigital';

    // Conta campanhas que possuem pelo menos 1 insight no período.
    // Isso garante que só aparecem segmentos com atividade real no intervalo.
    const { rows } = await pool.query<{
      id: string;
      name: string;
      slug: string;
      icon: string | null;
      color_theme: string | null;
      client_count: string;
      campaign_count: string;
      is_own: boolean;
    }>(
      `SELECT
         ss.id,
         ss.name,
         ss.slug,
         ss.icon,
         ss.color_theme,
         COUNT(DISTINCT c.uuid)::int  AS client_count,
         COUNT(DISTINCT cam.id)::int  AS campaign_count,
         (t.segment_id = ss.id)       AS is_own
       FROM public.system_segments ss
       LEFT JOIN public.clientes c
         ON  c.segment_id = ss.id
         AND c.tenant_id  = $1::uuid
       LEFT JOIN public.tenants t
         ON  t.id         = $1::uuid
         AND t.segment_id = ss.id
       -- Campanhas do segmento com insights no período
       LEFT JOIN ${S}."Campaign" cam
         ON  cam.tenant_id = $1::uuid
         AND (
               (cam.client_id IS NOT NULL AND cam.client_id = c.uuid)
            OR (cam.client_id IS NULL      AND t.segment_id = ss.id)
             )
         AND EXISTS (
               SELECT 1
               FROM ${S}."Insight" i
               WHERE i."campaignId" = cam.id
                 AND i.date >= $2::timestamp
                 AND i.date <= $3::timestamp
             )
       WHERE ss.is_active = true
         AND (
               t.segment_id = ss.id
            OR c.uuid IS NOT NULL
             )
       GROUP BY ss.id, ss.name, ss.slug, ss.icon, ss.color_theme, t.segment_id
       HAVING COUNT(DISTINCT cam.id) > 0
       ORDER BY COUNT(DISTINCT cam.id) DESC, ss.name ASC`,
      [payload.tenantId, startDate, endDate],
    );

    const segments: SegmentOption[] = rows.map(r => ({
      id:            r.id,
      name:          r.name,
      slug:          r.slug,
      icon:          r.icon,
      colorTheme:    r.color_theme,
      clientCount:   Number(r.client_count),
      campaignCount: Number(r.campaign_count),
      isOwn:         r.is_own,
    }));

    return NextResponse.json(segments);
  } catch (error: any) {
    console.error('GET /campanhas/segments error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar segmentos' }, { status: 500 });
  }
}
