import { NextRequest, NextResponse } from 'next/server';
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware';
import pool from '@/lib/database/connection';
import { verifyToken } from '@/lib/auth/jwt';

// POST /api/admin/login-logs/purge - Executar expurgo de logs antigos
export async function POST(request: NextRequest) {
  try {
    // Verificar permissões via middleware unificado
  const permissionCheck = await unifiedPermissionMiddleware(request);
  if (permissionCheck) return permissionCheck;

    // Obter parâmetros do corpo da requisição
    const body = await request.json();
    const retentionDays = body.retentionDays || 90;
    const confirmPurge = body.confirmPurge || false;

    // Validações
    if (retentionDays < 1 || retentionDays > 365) {
      return NextResponse.json(
        { message: 'Dias de retenção deve estar entre 1 e 365' },
        { status: 400 }
      );
    }

    if (!confirmPurge) {
      return NextResponse.json(
        { message: 'Confirmação de expurgo é obrigatória' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : request.cookies.get('accessToken')?.value;

    const decoded = bearerToken ? await verifyToken(bearerToken) : null;

    if (!decoded?.userId) {
      return NextResponse.json(
        { message: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const client = await pool.connect();
    
    try {
      console.log('🔍 Iniciando expurgo com retenção de', retentionDays, 'dias');
      
      // Obter estatísticas antes do expurgo
      console.log('📊 Obtendo estatísticas antes do expurgo...');
      const statsBefore = await client.query('SELECT * FROM get_login_logs_stats()');
      console.log('📊 Estatísticas antes:', statsBefore.rows[0]);
      
      // Executar expurgo com arquivamento
      console.log('🗑️ Executando expurgo com arquivamento...');
      const purgeResult = await client.query(
        'SELECT * FROM purge_login_logs_with_archive($1, $2, $3)',
        [retentionDays, decoded.userId, 'MANUAL_PURGE']
      );
      console.log('🗑️ Resultado do expurgo:', purgeResult.rows[0]);
      
      // Obter estatísticas após o expurgo
      console.log('📊 Obtendo estatísticas após o expurgo...');
      const statsAfter = await client.query('SELECT * FROM get_login_logs_stats()');
      console.log('📊 Estatísticas após:', statsAfter.rows[0]);
      
      const result = purgeResult.rows[0];
      
      // A função já registra na audit_logs, então não precisamos duplicar
      const deletedCount = parseInt(result.deleted_count) || 0;
      const archivedCount = parseInt(result.archived_count) || 0;
      
      return NextResponse.json({
        success: true,
        message: `Expurgo executado com sucesso. ${deletedCount} registros removidos e ${archivedCount} registros arquivados.`,
        data: {
          deleted_count: deletedCount,
          archived_count: archivedCount,
          retention_days: retentionDays,
          execution_time: result.execution_time,
          stats_before: statsBefore.rows[0],
          stats_after: statsAfter.rows[0]
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Erro ao executar expurgo de logs:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      { 
        message: 'Erro interno do servidor',
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint removido - usar /api/admin/login-logs para estatísticas
