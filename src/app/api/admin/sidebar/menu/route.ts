import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { verifyTokenNode } from '@/lib/auth/jwt-node';

// ============================================================
// GET /api/admin/sidebar/menu
// ============================================================
// Retorna menu da sidebar personalizado para o usuário logado
// Usa função do banco: get_sidebar_menu_for_user(UUID)
// ============================================================

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Buscar userId do token
    const userId = getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // 2. Chamar função do banco que retorna menu filtrado por permissões
    const result = await pool.query(
      'SELECT * FROM get_sidebar_menu_for_user($1)',
      [userId]
    );

    const menuItems = result.rows;

    // 3. Retornar menu
    return NextResponse.json({
      success: true,
      menuItems,
      count: menuItems.length,
    });

  } catch (error) {
    console.error('Erro ao buscar menu:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// HELPER: getUserIdFromRequest
// ============================================================
// Extrai userId do request (cookie ou header)
// ============================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    // Tentar pegar do cookie
    const cookie = request.cookies.get('accessToken');
    if (cookie?.value) {
      const payload = verifyTokenNode(cookie.value);
      return payload?.userId || null;
    }

    // Tentar pegar do header Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const payload = verifyTokenNode(token);
      return payload?.userId || null;
    }

    return null;
  } catch (error) {
    console.error('Erro ao extrair userId:', error);
    return null;
  }
}
