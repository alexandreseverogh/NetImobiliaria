/**
 * Textos e limites da auditoria por segmento (audit_text_settings).
 *
 * GET → parâmetros do segmento.
 * PUT → substitui (replace-all, transacional) os parâmetros do segmento.
 *       Body: { params: [{ key, min, max? }] }
 *       Estimativas aceitam intervalo (min e max); limites de exibição usam só min.
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { invalidateAuditTexts } from '@/lib/marketing/services/auditTextSettings';

export const dynamic = 'force-dynamic';

// Limites de exibição (contagens) nunca têm máximo; estimativas podem ter intervalo.
const COUNT_KEYS = new Set([
  'problem_dimensions', 'max_problems', 'max_opportunities',
  'client_campaigns_top', 'tenant_campaigns_top',
]);

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

interface ParamInput { key: string; min: number; max?: number | null }

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const { rows } = await pool.query(
      `SELECT param_key, value_min, value_max
       FROM campanhasmarketingdigital.audit_text_settings
       WHERE segment_id = $1::uuid
       ORDER BY param_key`,
      [params.id],
    );
    return NextResponse.json({
      params: rows.map(r => ({
        key: r.param_key,
        min: Number(r.value_min),
        max: r.value_max == null ? null : Number(r.value_max),
      })),
    });
  } catch (error: any) {
    console.error('GET audit-texts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }

  let body: { params?: ParamInput[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }
  const items = Array.isArray(body.params) ? body.params : null;
  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'Envie ao menos um parâmetro' }, { status: 400 });
  }

  const seen = new Set<string>();
  for (const p of items) {
    if (!p.key || typeof p.key !== 'string') {
      return NextResponse.json({ error: 'Parâmetro sem chave' }, { status: 400 });
    }
    if (seen.has(p.key)) {
      return NextResponse.json({ error: `Parâmetro duplicado: ${p.key}` }, { status: 400 });
    }
    seen.add(p.key);
    if (typeof p.min !== 'number' || !Number.isFinite(p.min) || p.min < 0) {
      return NextResponse.json({ error: `Valor inválido em ${p.key}` }, { status: 400 });
    }
    if (COUNT_KEYS.has(p.key)) {
      if (p.max != null) {
        return NextResponse.json({ error: `${p.key} é um limite único, sem intervalo` }, { status: 400 });
      }
      if (!Number.isInteger(p.min) || p.min < 1) {
        return NextResponse.json({ error: `${p.key} deve ser um inteiro maior que zero` }, { status: 400 });
      }
    } else {
      if (p.max != null && (!Number.isFinite(p.max) || p.max < p.min)) {
        return NextResponse.json({ error: `Intervalo inválido em ${p.key}: máximo menor que mínimo` }, { status: 400 });
      }
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM campanhasmarketingdigital.audit_text_settings WHERE segment_id = $1::uuid',
      [params.id],
    );
    for (const p of items) {
      await client.query(
        `INSERT INTO campanhasmarketingdigital.audit_text_settings
           (segment_id, param_key, value_min, value_max, updated_at)
         VALUES ($1::uuid, $2, $3, $4, now())`,
        [params.id, p.key, p.min, COUNT_KEYS.has(p.key) ? null : (p.max ?? null)],
      );
    }
    await client.query('COMMIT');
    invalidateAuditTexts(params.id);
    return NextResponse.json({ success: true, count: items.length });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('PUT audit-texts error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
