import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

/**
 * API de Features de Módulo (Master)
 * Gerencia o vínculo entre FEATURES e MÓDULOS do sistema
 */

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id: moduleId } = params;

  try {
    // Busca TODAS as features do sistema e marca quais pertencem a este módulo
    const query = `
      SELECT 
        sf.id, 
        sf.name, 
        sf.slug, 
        sc.name as category_name,
        EXISTS (
          SELECT 1 FROM system_feature_modules sfm 
          WHERE sfm.feature_id = sf.id AND sfm.module_id = $1
        ) as is_assigned
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      ORDER BY sc.name ASC, sf.name ASC
    `;
    const result = await pool.query(query, [moduleId]);
    
    return NextResponse.json({ 
      success: true, 
      features: result.rows 
    });
  } catch (error: any) {
    console.error('Error fetching module features map:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id: moduleId } = params;
  const body = await request.json();
  const { feature_ids } = body; // Suporte a lista vinda do frontend

  if (!Array.isArray(feature_ids)) {
    return NextResponse.json({ error: 'Lista de IDs inválida' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    await client.query('BEGIN');

    // Sincronização: Remove vínculos antigos e insere o novo mapa
    await client.query('DELETE FROM system_feature_modules WHERE module_id = $1', [moduleId]);

    if (feature_ids.length > 0) {
      for (const fId of feature_ids) {
        await client.query(
          'INSERT INTO system_feature_modules (feature_id, module_id) VALUES ($1, $2)',
          [fId, moduleId]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Arquitetura do motor sincronizada com sucesso' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error syncing module features:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id: moduleId } = params;
  const { searchParams } = new URL(request.url);
  const featureId = searchParams.get('feature_id');

  if (!featureId) {
    return NextResponse.json({ error: 'ID da Feature é obrigatório para desvinculação' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM system_feature_modules WHERE module_id = $1 AND feature_id = $2 RETURNING *',
      [moduleId, featureId]
    );

    if (result.rows.length === 0) {
      // Pode ser que a feature esteja vinculada via categoria, o que não pode ser removido aqui
      await client.query('ROLLBACK');
      return NextResponse.json({ 
        error: 'Vínculo direto não encontrado. Se a feature herda do módulo via categoria, remova o vínculo da categoria.' 
      }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Vínculo removido com sucesso' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error disassociating feature from module:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}