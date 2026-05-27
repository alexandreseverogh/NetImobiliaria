import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { verifyTokenNode } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/admin/sidebar/menu-items
// ============================================================
// Lista todos os itens do menu (ADMIN)
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : request.cookies.get('accessToken')?.value;
    const decoded = token ? verifyTokenNode(token) as any : null;
    
    const tenantId = decoded?.tenantId;
    const isMasterAdmin = decoded?.is_system_role === true;

    let query;
    let params: any[] = [];

    if (isMasterAdmin) {
      // Administrador Master vê tudo + módulos associados
      query = `
        SELECT 
          smi.*,
          sf.name as feature_name,
          p.action as permission_action,
          (
            SELECT jsonb_agg(module_id) 
            FROM sidebar_menu_item_modules 
            WHERE menu_item_id = smi.id
          ) as module_ids
        FROM sidebar_menu_items smi
        LEFT JOIN system_features sf ON smi.feature_id = sf.id
        LEFT JOIN permissions p ON smi.permission_id = p.id
        ORDER BY smi.order_index ASC
      `;
    } else if (tenantId) {
      // Usuários normais: Filtrar por módulos ativos do tenant
      query = `
        SELECT 
          smi.*,
          sf.name as feature_name,
          p.action as permission_action,
          (
            SELECT jsonb_agg(module_id) 
            FROM sidebar_menu_item_modules 
            WHERE menu_item_id = smi.id
          ) as module_ids
        FROM sidebar_menu_items smi
        LEFT JOIN system_features sf ON smi.feature_id = sf.id
        LEFT JOIN system_categorias sc ON sf.category_id = sc.id
        LEFT JOIN permissions p ON smi.permission_id = p.id
        WHERE smi.is_active = true
        AND (
          sc.module_id IS NULL 
          OR EXISTS (
            SELECT 1 FROM tenant_modules tm 
            WHERE tm.tenant_id = $1 
            AND tm.module_id = sc.module_id 
            AND tm.is_enabled = true
          )
        )
        ORDER BY smi.order_index ASC
      `;
      params = [tenantId];
    } else {
      return NextResponse.json({ success: false, items: [], message: 'Contexto não identificado' });
    }

    const result = await pool.query(query, params);

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
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'sidebar', 'CREATE')
    if (denied) return denied

    const data = await request.json();
    const userId = getUserIdFromRequest(request);

    if (!data.name || !data.icon_name) {
      return NextResponse.json({ success: false, message: 'Nome e ícone são obrigatórios' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Inserir Item
    const result = await client.query(
      `
      INSERT INTO sidebar_menu_items (
        parent_id, name, icon_name, url, resource, order_index, is_active,
        roles_required, permission_required, permission_action, description,
        feature_id, permission_id, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
      `,
      [
        data.parent_id || null, data.name, data.icon_name, data.url || null, data.resource || null,
        data.order_index || 0, data.is_active !== undefined ? data.is_active : true,
        data.roles_required ? JSON.stringify(data.roles_required) : null,
        data.permission_required || null, data.permission_action || null,
        data.description || null, data.feature_id || null, data.permission_id || null,
        userId, userId
      ]
    );

    const newItem = result.rows[0];

    // 2. Sincronizar Módulos
    if (data.module_ids && Array.isArray(data.module_ids)) {
      for (const moduleId of data.module_ids) {
        await client.query(
          'INSERT INTO sidebar_menu_item_modules (menu_item_id, module_id) VALUES ($1, $2)',
          [newItem.id, moduleId]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, item: newItem, message: 'Item criado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar item:', error);
    return NextResponse.json({ success: false, message: 'Erro ao criar item' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ============================================================
// PUT /api/admin/sidebar/menu-items
// ============================================================
export async function PUT(request: NextRequest) {
  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'sidebar', 'UPDATE')
    if (denied) return denied

    const data = await request.json();
    const userId = getUserIdFromRequest(request);

    if (!data.id) {
      return NextResponse.json({ success: false, message: 'ID é obrigatório' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Atualizar Item
    const result = await client.query(
      `
      UPDATE sidebar_menu_items SET
        parent_id = $2, name = $3, icon_name = $4, url = $5, resource = $6,
        order_index = $7, is_active = $8, roles_required = $9,
        permission_required = $10, permission_action = $11, description = $12,
        feature_id = $13, permission_id = $14, updated_by = $15, updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        data.id, data.parent_id || null, data.name, data.icon_name, data.url || null,
        data.resource || null, data.order_index || 0, data.is_active !== undefined ? data.is_active : true,
        data.roles_required ? JSON.stringify(data.roles_required) : null,
        data.permission_required || null, data.permission_action || null,
        data.description || null, data.feature_id || null, data.permission_id || null,
        userId
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Item não encontrado');
    }

    // 2. Sincronizar Módulos (Muitos-para-Muitos)
    if (data.module_ids !== undefined && Array.isArray(data.module_ids)) {
      // Limpar antigos
      await client.query('DELETE FROM sidebar_menu_item_modules WHERE menu_item_id = $1', [data.id]);
      
      // Inserir novos
      for (const moduleId of data.module_ids) {
        await client.query(
          'INSERT INTO sidebar_menu_item_modules (menu_item_id, module_id) VALUES ($1, $2)',
          [data.id, moduleId]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, item: result.rows[0], message: 'Item atualizado com sucesso' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar item:', error);
    return NextResponse.json({ success: false, message: 'Erro ao atualizar item' }, { status: 500 });
  } finally {
    client.release();
  }
}

// ============================================================
// DELETE /api/admin/sidebar/menu-items
// ============================================================
export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'sidebar', 'DELETE')
    if (denied) return denied

    const data = await request.json();
    
    if (!data.id) {
      return NextResponse.json({ success: false, message: 'ID é obrigatório' }, { status: 400 });
    }

    const result = await pool.query(
      'DELETE FROM public.sidebar_menu_items WHERE id = $1 RETURNING *',
      [data.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, message: 'Item não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Item removido com sucesso' 
    });
  } catch (error: any) {
    console.error('❌ [SIDEBAR_DELETE_ERR]:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro ao excluir item',
      details: error.message 
    }, { status: 500 });
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
