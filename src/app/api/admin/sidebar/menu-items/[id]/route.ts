import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { verifyTokenNode } from '@/lib/auth/jwt-node';

// ============================================================
// PUT /api/admin/sidebar/menu-items/[id]
// ============================================================
// Atualiza item do menu (ADMIN)
// ============================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = parseInt(params.id);
    const data = await request.json();
    const userId = getUserIdFromRequest(request);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, message: 'ID inválido' },
        { status: 400 }
      );
    }

    // Atualizar item
    const result = await pool.query(
      `
      UPDATE sidebar_menu_items SET
        parent_id = COALESCE($1, parent_id),
        name = COALESCE($2, name),
        icon_name = COALESCE($3, icon_name),
        url = COALESCE($4, url),
        resource = COALESCE($5, resource),
        order_index = COALESCE($6, order_index),
        is_active = COALESCE($7, is_active),
        roles_required = COALESCE($8, roles_required),
        permission_required = COALESCE($9, permission_required),
        permission_action = COALESCE($10, permission_action),
        description = COALESCE($11, description),
        feature_id = COALESCE($12, feature_id),
        permission_id = COALESCE($13, permission_id),
        updated_by = $14,
        updated_at = NOW()
      WHERE id = $15
      RETURNING *
      `,
      [
        data.parent_id !== undefined ? data.parent_id : null,
        data.name || null,
        data.icon_name || null,
        data.url !== undefined ? data.url : null,
        data.resource !== undefined ? data.resource : null,
        data.order_index !== undefined ? data.order_index : null,
        data.is_active !== undefined ? data.is_active : null,
        data.roles_required ? JSON.stringify(data.roles_required) : null,
        data.permission_required !== undefined ? data.permission_required : null,
        data.permission_action !== undefined ? data.permission_action : null,
        data.description !== undefined ? data.description : null,
        data.feature_id !== undefined ? data.feature_id : null,
        data.permission_id !== undefined ? data.permission_id : null,
        userId,
        itemId,
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Item não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      item: result.rows[0],
      message: 'Item atualizado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao atualizar item:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao atualizar item',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE /api/admin/sidebar/menu-items/[id]
// ============================================================
// Deleta item do menu (ADMIN)
// ============================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const itemId = parseInt(params.id);

    if (isNaN(itemId)) {
      return NextResponse.json(
        { success: false, message: 'ID inválido' },
        { status: 400 }
      );
    }

    // Verificar se item existe
    const checkResult = await pool.query(
      'SELECT id FROM sidebar_menu_items WHERE id = $1',
      [itemId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Item não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se tem filhos (não permite deletar se tiver)
    const childrenResult = await pool.query(
      'SELECT COUNT(*) as count FROM sidebar_menu_items WHERE parent_id = $1',
      [itemId]
    );

    if (parseInt(childrenResult.rows[0].count) > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Não é possível deletar item com subitens. Delete os filhos primeiro.',
        },
        { status: 400 }
      );
    }

    // Deletar item
    await pool.query('DELETE FROM sidebar_menu_items WHERE id = $1', [itemId]);

    return NextResponse.json({
      success: true,
      message: 'Item deletado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao deletar item:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao deletar item',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// HELPER: getUserIdFromRequest
// ============================================================

function getUserIdFromRequest(request: NextRequest): string | null {
  try {
    const cookie = request.cookies.get('accessToken');
    if (cookie?.value) {
      const payload = verifyTokenNode(cookie.value);
      return payload?.userId || null;
    }

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
