import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id } = params;

  try {
    const result = await pool.query('SELECT * FROM system_modules WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ module: result.rows[0] });
  } catch (error: any) {
    console.error('Error fetching module:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id } = params;
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, slug, description, icon, is_active, theme_mode, primary_color } = body;

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    const result = await pool.query(
      `UPDATE system_modules
       SET name = $1, slug = $2, description = $3, icon = $4, is_active = $5,
           theme_mode = $6, primary_color = $7, updated_at = NOW()
       WHERE id = $8
       RETURNING *`,
      [name, slug, description, icon, is_active, theme_mode, primary_color, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      module: result.rows[0] 
    });
  } catch (error: any) {
    console.error('Error updating module:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id } = params;
  const client = await pool.connect();

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    await client.query('BEGIN');

    // Clean up dependent tables
    await client.query('DELETE FROM tenant_modules WHERE module_id = $1', [id]);
    await client.query('DELETE FROM system_segment_modules WHERE module_id = $1', [id]);
    await client.query('DELETE FROM sidebar_menu_item_modules WHERE module_id = $1', [id]);
    await client.query('DELETE FROM system_feature_modules WHERE module_id = $1', [id]);
    await client.query('DELETE FROM system_categorias WHERE module_id = $1', [id]);

    const result = await client.query('DELETE FROM system_modules WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Módulo não encontrado' }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Módulo e suas dependências excluídos com sucesso' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error deleting module:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}