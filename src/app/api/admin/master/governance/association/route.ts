import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  // Apenas Master Admin
  if (!decoded || !decoded.is_system_role) {
    if (decoded?.username !== 'admin') {
      return NextResponse.json({ error: 'Acesso Restrito' }, { status: 403 });
    }
  }

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    const { action, sourceId, targetId } = await request.json();

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'IDs de origem e destino obrigatórios' }, { status: 400 });
    }

    if (action === 'feature-module') {
      // Associar Funcionalidade a Módulo
      await client.query(`
        INSERT INTO system_feature_modules (feature_id, module_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [sourceId, targetId]);
      
      return NextResponse.json({ success: true, message: 'Funcionalidade anexada ao módulo!' });
    } 
    
    if (action === 'module-segment') {
      // Associar Módulo a Segmento
      await client.query(`
        INSERT INTO system_segment_modules (module_id, segment_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [sourceId, targetId]);

      return NextResponse.json({ success: true, message: 'Módulo anexado ao segmento!' });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error: any) {
    console.error('Erro na associação de governança:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || (!decoded.is_system_role && decoded.username !== 'admin')) {
    return NextResponse.json({ error: 'Acesso Restrito' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    const { type, feature_id, metadata } = await request.json();

    if (type === 'skill_metadata') {
      await client.query(`
        UPDATE system_features 
        SET skill_metadata = $1, is_skill = true 
        WHERE id = $2 OR slug = $2::text
      `, [JSON.stringify(metadata), feature_id]);

      return NextResponse.json({ success: true, message: 'Protocolo da Skill atualizado com sucesso!' });
    }

    return NextResponse.json({ error: 'Operação não suportada' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || (!decoded.is_system_role && decoded.username !== 'admin')) {
    return NextResponse.json({ error: 'Acesso Restrito' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    const { action, sourceId, targetId } = await request.json();

    if (!sourceId || !targetId) {
      return NextResponse.json({ error: 'IDs de origem e destino obrigatórios' }, { status: 400 });
    }

    if (action === 'feature-module') {
      await client.query(`
        DELETE FROM system_feature_modules 
        WHERE feature_id = $1 AND module_id = $2
      `, [sourceId, targetId]);
      
      return NextResponse.json({ success: true, message: 'Funcionalidade desvinculada do módulo!' });
    } 
    
    if (action === 'module-segment') {
      await client.query(`
        DELETE FROM system_segment_modules 
        WHERE module_id = $1 AND segment_id = $2
      `, [sourceId, targetId]);

      return NextResponse.json({ success: true, message: 'Módulo desvinculado do segmento!' });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });

  } catch (error: any) {
    console.error('Erro na desassociação de governança:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
