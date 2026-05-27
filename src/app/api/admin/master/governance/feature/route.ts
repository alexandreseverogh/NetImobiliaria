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

    const { featureId, is_skill, skill_metadata } = await request.json();

    if (!featureId) {
      return NextResponse.json({ error: 'ID da funcionalidade é obrigatório' }, { status: 400 });
    }

    // 1. Atualizar status de Skill e Metadados
    await client.query(`
      UPDATE system_features 
      SET 
        is_skill = $1,
        skill_metadata = COALESCE($2, skill_metadata)
      WHERE id = $3
    `, [is_skill, skill_metadata ? JSON.stringify(skill_metadata) : null, featureId]);

    return NextResponse.json({
      success: true,
      message: `Funcionalidade ${is_skill ? 'promovida a Skill' : 'normalizada'} com sucesso!`
    });

  } catch (error: any) {
    console.error('Erro ao atualizar governança:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
