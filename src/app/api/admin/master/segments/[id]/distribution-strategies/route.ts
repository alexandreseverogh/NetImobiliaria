/**
 * Estratégias de Distribuição de Leads por segmento (evolução do F7 —
 * docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §6).
 *
 * GET /api/admin/master/segments/[id]/distribution-strategies
 *   → lista ordenada das estratégias ativas/inativas do segmento
 *
 * PUT /api/admin/master/segments/[id]/distribution-strategies
 *   → substitui (replace-all) o conjunto do segmento. Body: { strategies: [...] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { DISTRIBUTION_STRATEGY_CATALOG } from '@/lib/routing/strategies';

export const dynamic = 'force-dynamic';

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const VALID_KEYS = new Set(DISTRIBUTION_STRATEGY_CATALOG.map(s => s.key));

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

interface StrategyInput {
  strategyKey: string;
  priority: number;
  isActive?: boolean;
  config?: Record<string, any>;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const { rows } = await pool.query(
      `SELECT strategy_key, priority, is_active, config
         FROM public.segment_distribution_strategies
        WHERE segment_id = $1::uuid
        ORDER BY priority ASC`,
      [params.id],
    );
    return NextResponse.json({
      strategies: rows.map(r => ({
        strategyKey: r.strategy_key,
        priority: r.priority,
        isActive: r.is_active,
        config: r.config || {},
      })),
      catalog: DISTRIBUTION_STRATEGY_CATALOG,
    });
  } catch (err: any) {
    console.error('[segments/distribution-strategies GET]', err?.message ?? err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const strategies: StrategyInput[] = Array.isArray(body?.strategies) ? body.strategies : [];

  // Campos de config que, quando presentes, são identificadores SQL (tabela/coluna) e
  // precisam ser validados antes de qualquer estratégia interpolá-los numa query — mesmo
  // padrão de data-entities/route.ts.
  const IDENT_FIELDS_BY_STRATEGY: Record<string, string[]> = {
    owner_of_asset: ['targetTable', 'targetIdColumn', 'ownerColumn', 'estadoColumn', 'cidadeColumn'],
    geo_area: ['sellerAreaTable', 'sellerAreaFk', 'sellerEstadoColumn', 'sellerCidadeColumn'],
    plantonista_fallback: ['sellerAreaTable', 'sellerAreaFk', 'sellerEstadoColumn', 'sellerCidadeColumn'],
  };

  for (const s of strategies) {
    if (!s.strategyKey || !VALID_KEYS.has(s.strategyKey)) {
      return NextResponse.json({ error: `strategyKey inválido: "${s.strategyKey}"` }, { status: 400 });
    }
    const identFields = IDENT_FIELDS_BY_STRATEGY[s.strategyKey] || [];
    for (const field of identFields) {
      const value = (s.config || {})[field];
      if (value != null && value !== '' && !IDENT_RE.test(value)) {
        return NextResponse.json({ error: `config.${field} inválido — use apenas letras, números e underscore` }, { status: 400 });
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM public.segment_distribution_strategies WHERE segment_id = $1::uuid', [params.id]);

    for (const s of strategies) {
      await client.query(
        `INSERT INTO public.segment_distribution_strategies (segment_id, strategy_key, priority, is_active, config)
         VALUES ($1::uuid, $2, $3, $4, $5::jsonb)`,
        [params.id, s.strategyKey, s.priority ?? 0, s.isActive ?? true, JSON.stringify(s.config || {})],
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[segments/distribution-strategies PUT]', err?.message ?? err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}
