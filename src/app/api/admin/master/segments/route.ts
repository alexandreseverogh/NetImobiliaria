import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { SEGMENT_SEED_DEFAULTS } from '@/lib/intelligence/benchmarkResolver';
import { getSegmentPendencies } from '@/lib/marketing/services/segmentReadiness';

/* ── auth helper ─────────────────────────────────────────────────── */

async function requireMaster(request: NextRequest) {
  const token   = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

/* ── GET — lista segmentos + módulos disponíveis ─────────────────── */

export async function GET(request: NextRequest) {
  const decoded = await requireMaster(request);
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });

  try {
    const result = await pool.query(`
      SELECT
        s.*,
        string_agg(m.name, ', ' ORDER BY m.name)              AS module_names,
        array_agg(m.id) FILTER (WHERE m.id IS NOT NULL)       AS module_ids,
        (SELECT COUNT(*)::int FROM public.clientes c WHERE c.segment_id = s.id) AS tenant_count,
        -- Prontidão do segmento (checklist de curadoria). "Meta saudável" = credencial ativa com
        -- token presente, sem falhas consecutivas do canário horário, sem disjuntor aberto e não
        -- expirada. Mesma condição de findHealthyMetaTenantForSegment (segmentReadiness.ts).
        (length(btrim(COALESCE(s.description, ''))) > 0)                        AS has_description,
        (SELECT COUNT(DISTINCT sat.angle_slug)::int
           FROM campanhasmarketingdigital.segment_angle_terms sat
          WHERE sat.segment_id = s.id)                                          AS angles_count,
        jsonb_array_length(COALESCE(s.network_defaults->'meta'->'suggested_interests', '[]'::jsonb))::int AS interests_count,
        (SELECT COUNT(*)::int
           FROM public.tenants t
           JOIN public.tenant_network_credentials tnc ON tnc.tenant_id = t.id AND tnc.is_active = true
           JOIN public.ad_networks n ON n.id = tnc.network_id AND n.code = 'meta'
          WHERE t.segment_id = s.id)                                            AS meta_tenants_connected,
        (SELECT COUNT(*)::int
           FROM public.tenants t
           JOIN public.tenant_network_credentials tnc ON tnc.tenant_id = t.id AND tnc.is_active = true
           JOIN public.ad_networks n ON n.id = tnc.network_id AND n.code = 'meta'
          WHERE t.segment_id = s.id
            AND (tnc.credentials->>'access_token') IS NOT NULL
            AND tnc.consecutive_failures = 0
            AND tnc.circuit_tripped_at IS NULL
            AND (tnc.expires_at IS NULL OR tnc.expires_at > now()))             AS meta_tenants_healthy
      FROM public.system_segments s
      LEFT JOIN public.system_segment_modules sm ON sm.segment_id = s.id
      LEFT JOIN public.system_modules         m  ON m.id = sm.module_id
      GROUP BY s.id
      ORDER BY s.name ASC
    `);

    const modulesRes = await pool.query(
      'SELECT id, name, slug FROM public.system_modules ORDER BY name'
    );

    return NextResponse.json({
      segments:         result.rows,
      availableModules: modulesRes.rows,
    });
  } catch (error: any) {
    console.error('[segments GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* ── POST — cria novo segmento ────────────────────────────────────── */

export async function POST(request: NextRequest) {
  const decoded = await requireMaster(request);
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });

  try {
    const body = await request.json();
    const {
      name, slug, description = '', icon = 'box',
      color_theme = '#2563eb', is_active = true,
      module_ids = [] as string[],
      imagens_por_ia = false as boolean,
      chatbot_max_turns_default = 6 as number,
      distribution_role_name = 'Corretor' as string,
      vocabulary = {} as Record<string, any>,
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name e slug são obrigatórios' }, { status: 400 });
    }

    const { rows } = await pool.query(`
      INSERT INTO public.system_segments
        (name, slug, description, icon, color_theme, is_active, imagens_por_ia, chatbot_max_turns_default,
         distribution_role_name, vocabulary)
      VALUES ($1, $2, $3, $4, $5, $6, $7::BOOLEAN, $8, $9, $10::jsonb)
      RETURNING id
    `, [
      name, slug, description, icon, color_theme, is_active, imagens_por_ia ?? false, chatbot_max_turns_default || 6,
      distribution_role_name || 'Corretor', JSON.stringify(vocabulary ?? {}),
    ]);

    const newId = rows[0].id;

    // Auto-semear todos os benchmarks do segmento a partir de SEGMENT_SEED_DEFAULTS.
    // Garante que o agente funciona imediatamente e sem hardcode em runtime.
    const seedEntries = Object.entries(SEGMENT_SEED_DEFAULTS);
    if (seedEntries.length > 0) {
      const vals   = seedEntries.map((_, i) => `($1::uuid, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4}, $${i * 4 + 5})`).join(', ');
      const params: any[] = [newId];
      for (const [key, def] of seedEntries) {
        params.push(key, def.label, def.value, def.unit);
      }
      // ON CONFLICT precisa bater EXATAMENTE com o índice único real
      // (system_benchmarks_seg_metric_net_key — inclui network_id via COALESCE, mesma
      // constraint que a rota irmã /segments/[id]/benchmarks já respeita). Sem isso, TODA
      // criação de segmento com SEGMENT_SEED_DEFAULTS não-vazio (sempre) quebrava aqui.
      await pool.query(
        `INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit)
         VALUES ${vals}
         ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid))
         DO NOTHING`,
        params,
      );
    }

    // Associar módulos
    if (module_ids.length > 0) {
      const vals   = module_ids.map((_: string, i: number) => `($1::uuid, $${i + 2}::uuid)`).join(', ');
      const params = [newId, ...module_ids];
      await pool.query(
        `INSERT INTO public.system_segment_modules (segment_id, module_id) VALUES ${vals}
         ON CONFLICT DO NOTHING`,
        params
      );
    }

    // Pendências de prontidão logo após o cadastro: o Master vê o que falta sem depender de
    // lembrar de abrir a lista depois. Falha aqui nunca desfaz o cadastro (é só informativo).
    const pendencies = await getSegmentPendencies(newId).catch(() => [] as string[]);
    return NextResponse.json({ id: newId, pendencies }, { status: 201 });
  } catch (error: any) {
    console.error('[segments POST]', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slug já existe' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* ── PUT — atualiza segmento existente ───────────────────────────── */

export async function PUT(request: NextRequest) {
  const decoded = await requireMaster(request);
  if (!decoded) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });

  try {
    const body = await request.json();
    const {
      id, name, description = '', icon = 'box',
      color_theme = '#2563eb', is_active = true,
      module_ids = [] as string[],
      imagens_por_ia = false as boolean,
      chatbot_max_turns_default = 6 as number,
      distribution_role_name = 'Corretor' as string,
      vocabulary = {} as Record<string, any>,
    } = body;

    if (!id || !name) {
      return NextResponse.json({ error: 'id e name são obrigatórios' }, { status: 400 });
    }

    // TTL padrão da foto de contatos (dias). Se não vier, mantém o valor atual do segmento.
    let avatarTtlDefault: number | null = null;
    if ('avatar_ttl_days_default' in body && body.avatar_ttl_days_default != null && body.avatar_ttl_days_default !== '') {
      const n = Number(body.avatar_ttl_days_default);
      if (!Number.isInteger(n) || n < 1 || n > 365) {
        return NextResponse.json({ error: 'Atualização da foto deve estar entre 1 e 365 dias' }, { status: 400 });
      }
      avatarTtlDefault = n;
    }

    await pool.query(`
      UPDATE public.system_segments SET
        name                           = $2,
        description                    = $3,
        icon                           = $4,
        color_theme                    = $5,
        is_active                      = $6,
        imagens_por_ia                 = $7::BOOLEAN,
        chatbot_max_turns_default      = $8,
        distribution_role_name         = $9,
        vocabulary                     = $10::jsonb,
        avatar_ttl_days_default        = COALESCE($11::int, avatar_ttl_days_default)
      WHERE id = $1::uuid
    `, [
      id, name, description, icon, color_theme, is_active, imagens_por_ia ?? false, chatbot_max_turns_default || 6,
      distribution_role_name || 'Corretor', JSON.stringify(vocabulary ?? {}), avatarTtlDefault,
    ]);

    // Re-sincronizar módulos: remove todos e reinsere
    await pool.query(
      'DELETE FROM public.system_segment_modules WHERE segment_id = $1::uuid',
      [id]
    );
    if (module_ids.length > 0) {
      const vals   = module_ids.map((_: string, i: number) => `($1::uuid, $${i + 2}::uuid)`).join(', ');
      const params = [id, ...module_ids];
      await pool.query(
        `INSERT INTO public.system_segment_modules (segment_id, module_id) VALUES ${vals}
         ON CONFLICT DO NOTHING`,
        params
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[segments PUT]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
