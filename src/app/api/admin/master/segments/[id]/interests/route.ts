import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

/**
 * GET /api/admin/master/segments/[id]/interests?network=meta
 * Retorna os interesses sugeridos do segmento para uma rede.
 *
 * PATCH /api/admin/master/segments/[id]/interests
 * Body: { network: 'meta', interests: [{id: string, name: string}] }
 * Atualiza network_defaults.[network].suggested_interests
 * Merge aditivo — preserva os demais campos do network_defaults.
 */

export const dynamic = 'force-dynamic';

async function getPayload(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  return token ? await verifyToken(token) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const decoded = await getPayload(request);
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const network = searchParams.get('network') || 'meta';

  try {
    const res = await pool.query(
      `SELECT network_defaults FROM public.system_segments WHERE id = $1::uuid LIMIT 1`,
      [params.id],
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }

    const nd = res.rows[0].network_defaults?.[network] || {};
    const interests: { id: string; name: string }[] =
      Array.isArray(nd.suggested_interests) ? nd.suggested_interests : [];

    return NextResponse.json({ interests, network });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const decoded = await getPayload(request);
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { network = 'meta', interests } = body;

    if (!Array.isArray(interests)) {
      return NextResponse.json({ error: 'Campo "interests" deve ser um array' }, { status: 400 });
    }

    // Validate each item has id and name
    const valid = interests.every(
      (i: any) => typeof i.id === 'string' && typeof i.name === 'string',
    );
    if (!valid) {
      return NextResponse.json({ error: 'Cada interesse deve ter { id: string, name: string }' }, { status: 400 });
    }

    // Merge aditivo robusto: define network_defaults.<network> = (meta existente ou {})
    // mesclado com suggested_interests. Cria o objeto <network> se não existir
    // (jsonb_set puro não cria o nível intermediário ausente — bug em segmentos novos).
    const { rowCount } = await pool.query(
      `UPDATE public.system_segments
       SET network_defaults = jsonb_set(
         COALESCE(network_defaults, '{}'::jsonb),
         ARRAY[$1::text],
         COALESCE(network_defaults -> $1::text, '{}'::jsonb)
           || jsonb_build_object('suggested_interests', $2::jsonb),
         true
       )
       WHERE id = $3::uuid`,
      [
        network,
        JSON.stringify(interests),
        params.id,
      ],
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, count: interests.length });
  } catch (err: any) {
    console.error('[segment interests PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
