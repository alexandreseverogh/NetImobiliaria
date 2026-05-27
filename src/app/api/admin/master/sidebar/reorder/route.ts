import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

/**
 * API para Reordenagem em Massa da Sidebar (Estático/Fábrica)
 * Exclusivo para Master Admins
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');
                
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ 
      success: false, 
      message: 'Acesso Master Requerido para reordenagem de fábrica' 
    }, { status: 403 });
  }

  const client = await pool.connect();

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Lista de itens inválida' 
      }, { status: 400 });
    }

    await client.query('BEGIN');

    for (const item of items) {
      const { id, parent_id, order_index } = item;
      
      await client.query(
        `UPDATE sidebar_menu_items 
         SET parent_id = $2, 
             order_index = $3,
             updated_at = NOW(),
             updated_by = $4
         WHERE id = $1`,
        [id, parent_id || null, order_index, (decoded as any).userId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: 'Ordem de fábrica sincronizada com sucesso' 
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error reordering sidebar:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro ao processar reordenagem: ' + error.message 
    }, { status: 500 });
  } finally {
    client.release();
  }
}