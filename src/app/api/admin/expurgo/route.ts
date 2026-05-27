import { NextRequest, NextResponse } from 'next/server';
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'imoveis', 'DELETE');
    if (denied) return denied;
    const permissionCheck = await unifiedPermissionMiddleware(request);
    if (permissionCheck) return permissionCheck;

    const { getTenantContext } = await import('@/lib/auth/get-tenant-from-token')
    const { tenantId, userId } = await getTenantContext(request)

    const body = await request.json();
    const retentionDays = body.retentionDays || 90;
    const confirmPurge = body.confirmPurge || false;

    if (retentionDays < 1 || retentionDays > 365) {
      return NextResponse.json({ message: 'Dias de retenção deve estar entre 1 e 365' }, { status: 400 });
    }

    if (!confirmPurge) {
      return NextResponse.json({ message: 'Confirmação de expurgo é obrigatória' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ message: 'Usuário não autenticado' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const purgeResult = await client.query(
        'SELECT * FROM purge_login_logs_with_archive($1, $2, $3, $4)',
        [retentionDays, userId, 'MANUAL_PURGE', tenantId || null]
      );
      
      const result = purgeResult.rows[0];
      const deletedCount = parseInt(result.deleted_count) || 0;
      const archivedCount = parseInt(result.archived_count) || 0;
      
      return NextResponse.json({
        success: true,
        message: `Expurgo executado com sucesso. ${deletedCount} registros removidos e ${archivedCount} registros arquivados.`,
        data: {
          deleted_count: deletedCount,
          archived_count: archivedCount,
          retention_days: retentionDays
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Erro ao executar expurgo de logs:', error);
    return NextResponse.json({ message: 'Erro interno do servidor' }, { status: 500 });
  }
}
