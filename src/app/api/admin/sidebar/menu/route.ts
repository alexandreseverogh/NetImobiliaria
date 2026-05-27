import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { verifyTokenNode } from '@/lib/auth/jwt-node';

// ============================================================
// GET /api/admin/sidebar/menu
// ============================================================
// Retorna menu da sidebar personalizado para o usuário logado
// Agora suporta TenantId para filtragem por Segmento (Blueprint)
// ============================================================

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Buscar dados do token (Payload completo)
    const payload = getTokenPayload(request);
    console.log('[MENU_API] Payload extraído do token:', payload);
    
    if (!payload || !payload.userId) {
      console.warn('[MENU_API] Alerta: Payload inválido ou sem userId');
      return NextResponse.json(
        { success: false, message: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const userId = payload.userId;
    const tenantId = payload.tenantId || null;

    // 2. Extrair system_id da query
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get('system_id') || 'admin';

    // 3. Chamada da função SQL com suporte a Segment Blueprints
    console.log(`[MENU_API] Buscando menu | User: ${userId} | System: ${systemId} | Tenant: ${tenantId}`);
    
    try {
      // A função SQL retorna uma única linha com uma coluna JSONB (array de itens)
      const query = 'SELECT get_sidebar_menu_for_user($1::uuid, $2, $3::uuid) AS menu';
      const result = await pool.query(query, [userId, systemId, tenantId]);

      // 4. Buscar Tema configurado para este tenant ou sistema
      let theme = { mode: 'light', primaryColor: '#2563eb', secondaryColor: '#F1F1F1', tenantName: 'Net Imobiliária' };
      
      if (tenantId) {
        const tenantThemeQuery = `
          SELECT name, primary_color, secondary_color 
          FROM tenants 
          WHERE id = $1
        `;
        const tenantThemeRes = await pool.query(tenantThemeQuery, [tenantId]);
        if (tenantThemeRes.rows.length > 0) {
          const t = tenantThemeRes.rows[0];
          theme = {
            mode: 'light', // Por enquanto fixo light, mas pode ser expandido
            primaryColor: t.primary_color || '#2563eb',
            secondaryColor: t.secondary_color || '#F1F1F1',
            tenantName: t.name
          };
        }
      }

      // Extrair o array JSON da coluna retornada
      const menuItems = result.rows[0]?.menu || [];
      
      console.log(`[MENU_API] Itens retornados: ${Array.isArray(menuItems) ? menuItems.length : 'N/A'}`);

      return NextResponse.json({
        success: true,
        menuItems,
        theme,
        count: Array.isArray(menuItems) ? menuItems.length : 0,
      });
    } catch (dbError: any) {
      console.error('[MENU_API] Erro no Banco de Dados:', dbError);
      
      if (dbError.code === '22P02') {
        return NextResponse.json(
          { success: false, message: 'Sessão inválida' },
          { status: 401 }
        );
      }
      
      throw dbError;
    }

  } catch (error) {
    console.error('[MENU_API] Erro Fatal:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Extrai o payload completo do token JWT (cookies ou header)
 */
function getTokenPayload(request: NextRequest): any | null {
  try {
    // 1. Tentar do cookie (admin_auth_token)
    const cookie = request.cookies.get('admin_auth_token');
    if (cookie?.value) {
      return verifyTokenNode(cookie.value);
    }

    // 2. Tentar do header Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      return verifyTokenNode(token);
    }

    return null;
  } catch (error) {
    console.error('Erro ao extrair payload do token:', error);
    return null;
  }
}
