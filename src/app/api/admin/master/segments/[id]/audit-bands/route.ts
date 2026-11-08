/**
 * Faixas de pontuação da auditoria por segmento (audit_scoring_bands).
 *
 * GET  → todas as faixas do segmento, agrupadas por dimensão e regra.
 * PUT  → substitui (replace-all, transacional) as faixas do segmento.
 *        Body: { bands: [{ dimension, ruleKey, sortOrder, comparison, bound, score, label? }] }
 *
 * Validação: cada regra precisa ter ao menos uma faixa e terminar em 'any' (fallback);
 * comparação 'any' não tem limite; as demais exigem limite numérico.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { invalidateAuditBands } from '@/lib/marketing/services/auditScoringBands';

export const dynamic = 'force-dynamic';

const COMPARISONS = new Set(['lte', 'lt', 'gte', 'gt', 'any']);

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

interface BandInput {
  dimension: string;
  ruleKey: string;
  sortOrder: number;
  comparison: string;
  bound: number | null;
  score: number;
  label?: string | null;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const { rows } = await pool.query(
      `SELECT dimension, rule_key, sort_order, comparison, bound_value, score, label
       FROM campanhasmarketingdigital.audit_scoring_bands
       WHERE segment_id = $1::uuid
       ORDER BY dimension, rule_key, sort_order`,
      [params.id],
    );
    const bands = rows.map(r => ({
      dimension:  r.dimension,
      ruleKey:    r.rule_key,
      sortOrder:  Number(r.sort_order),
      comparison: r.comparison,
      bound:      r.bound_value == null ? null : Number(r.bound_value),
      score:      Number(r.score),
      label:      r.label,
    }));
    return NextResponse.json({ bands });
  } catch (error: any) {
    console.error('GET audit-bands error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }

  let body: { bands?: BandInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }
  const bands = Array.isArray(body.bands) ? body.bands : null;
  if (!bands || bands.length === 0) {
    return NextResponse.json({ error: 'Envie ao menos uma faixa' }, { status: 400 });
  }

  // Validação antes de gravar
  const groups = new Map<string, BandInput[]>();
  for (const b of bands) {
    if (!b.dimension || !b.ruleKey || !Number.isInteger(b.sortOrder)) {
      return NextResponse.json({ error: 'Faixa com dimensão, regra ou ordem inválida' }, { status: 400 });
    }
    if (!COMPARISONS.has(b.comparison)) {
      return NextResponse.json({ error: `Comparação inválida: ${b.comparison}` }, { status: 400 });
    }
    if (typeof b.score !== 'number' || !Number.isFinite(b.score)) {
      return NextResponse.json({ error: `Nota inválida em ${b.dimension}/${b.ruleKey}` }, { status: 400 });
    }
    if (b.comparison === 'any' && b.bound !== null && b.bound !== undefined) {
      return NextResponse.json({ error: `Faixa 'any' não tem limite (${b.dimension}/${b.ruleKey})` }, { status: 400 });
    }
    if (b.comparison !== 'any' && (typeof b.bound !== 'number' || !Number.isFinite(b.bound))) {
      return NextResponse.json({ error: `Limite obrigatório em ${b.dimension}/${b.ruleKey}` }, { status: 400 });
    }
    const key = `${b.dimension}|${b.ruleKey}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(b);
  }
  for (const [key, rows] of Array.from(groups.entries())) {
    const sorted = [...rows].sort((a, c) => a.sortOrder - c.sortOrder);
    if (sorted[sorted.length - 1].comparison !== 'any') {
      return NextResponse.json({ error: `A regra ${key.replace('|', '/')} precisa terminar em uma faixa 'any' (fallback)` }, { status: 400 });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM campanhasmarketingdigital.audit_scoring_bands WHERE segment_id = $1::uuid',
      [params.id],
    );
    for (const b of bands) {
      await client.query(
        `INSERT INTO campanhasmarketingdigital.audit_scoring_bands
           (segment_id, dimension, rule_key, sort_order, comparison, bound_value, score, label, updated_at)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, now())`,
        [
          params.id, b.dimension, b.ruleKey, b.sortOrder, b.comparison,
          b.comparison === 'any' ? null : b.bound,
          b.score, b.label ?? null,
        ],
      );
    }
    await client.query('COMMIT');
    invalidateAuditBands(params.id);
    return NextResponse.json({ success: true, count: bands.length });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('PUT audit-bands error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
