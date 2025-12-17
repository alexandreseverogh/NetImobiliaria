import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { verifyTokenNode } from '@/lib/auth/jwt-node';

// ============================================================
// GET /api/admin/sidebar/menu-items
// ============================================================
// Lista todos os itens do menu (ADMIN)
// ============================================================

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT 
        smi.*,
        sf.name as feature_name,
        p.action as permission_action
      FROM sidebar_menu_items smi
      LEFT JOIN system_features sf ON smi.feature_id = sf.id
      LEFT JOIN permissions p ON smi.permission_id = p.id
      ORDER BY smi.order_index ASC
    `);

    return NextResponse.json({
      success: true,
      items: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Erro ao buscar itens do menu:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar itens',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// POST /api/admin/sidebar/menu-items
// ============================================================
// Cria novo item do menu (ADMIN)
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const userId = getUserIdFromRequest(request);

    // Validar dados obrigatórios
    if (!data.name || !data.icon_name) {
      return NextResponse.json(
        { success: false, message: 'Nome e ícone são obrigatórios' },
        { status: 400 }
      );
    }

    // Inserir novo item
    const result = await pool.query(
      `
      INSERT INTO sidebar_menu_items (
        parent_id,
        name,
        icon_name,
        url,
        resource,
        order_index,
        is_active,
        roles_required,
        permission_required,
        permission_action,
        description,
        feature_id,
        permission_id,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
      `,
      [
        data.parent_id || null,
        data.name,
        data.icon_name,
        data.url || null,
        data.resource || null,
        data.order_index || 0,
        data.is_active !== undefined ? data.is_active : true,
        data.roles_required ? JSON.stringify(data.roles_required) : null,
        data.permission_required || null,
        data.permission_action || null,
        data.description || null,
        data.feature_id || null,
        data.permission_id || null,
        userId,
        userId,
      ]
    );

    return NextResponse.json({
      success: true,
      item: result.rows[0],
      message: 'Item criado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao criar item:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao criar item',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT /api/admin/sidebar/menu-items
// ============================================================
// Atualiza item do menu (ADMIN)
// ============================================================

export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const userId = getUserIdFromRequest(request);

    if (!data.id) {
      return NextResponse.json(
        { success: false, message: 'ID do item é obrigatório' },
        { status: 400 }
      );
    }

    // Atualizar item
    const result = await pool.query(
      `
      UPDATE sidebar_menu_items SET
        parent_id = $2,
        name = $3,
        icon_name = $4,
        url = $5,
        resource = $6,
        order_index = $7,
        is_active = $8,
        roles_required = $9,
        permission_required = $10,
        permission_action = $11,
        description = $12,
        feature_id = $13,
        permission_id = $14,
        updated_by = $15,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        data.id,
        data.parent_id || null,
        data.name,
        data.icon_name,
        data.url || null,
        data.resource || null,
        data.order_index || 0,
        data.is_active !== undefined ? data.is_active : true,
        data.roles_required ? JSON.stringify(data.roles_required) : null,
        data.permission_required || null,
        data.permission_action || null,
        data.description || null,
        data.feature_id || null,
        data.permission_id || null,
        userId,
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
