/**
 * POST /api/admin/sidebar/category-order
 *
 * Salva a ordem PESSOAL das categorias (opções agrupadoras) da sidebar do usuário logado —
 * distinto de system_categorias.sort_order (ordem-padrão global, curada pelo Master em
 * /admin/master/cockpit). Preferência individual: nunca afeta a sidebar de outros usuários,
 * inclusive outros Masters. Qualquer usuário autenticado pode salvar a própria — não é uma
 * ação administrativa, é uma customização pessoal de visualização.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyTokenNode } from '@/lib/auth/jwt-node';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

function getUserId(request: NextRequest): string | null {
  const cookie = request.cookies.get('admin_auth_token')?.value;
  const authHeader = request.headers.get('authorization');
  const token = cookie || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);
  if (!token) return null;
  const decoded = verifyTokenNode(token);
  return decoded?.userId || null;
}

export async function POST(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderedIds } = body;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds deve ser um array não vazio' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        const categoryId = Number(orderedIds[i]);
        if (!Number.isFinite(categoryId)) continue; // ignora qualquer id não-numérico (ex.: grupo)
        await client.query(
          `INSERT INTO public.user_sidebar_category_order (user_id, category_id, sort_order)
           VALUES ($1::uuid, $2, $3)
           ON CONFLICT (user_id, category_id) DO UPDATE SET sort_order = $3, updated_at = NOW()`,
          [userId, categoryId, i]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao salvar ordem pessoal da sidebar:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/sidebar/category-order
 *
 * Restaura a ordem padrão (global, curada pelo Master) — apaga toda a preferência pessoal
 * do usuário logado.
 */
export async function DELETE(request: NextRequest) {
  const userId = getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    await pool.query('DELETE FROM public.user_sidebar_category_order WHERE user_id = $1::uuid', [userId]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao restaurar ordem padrão da sidebar:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
