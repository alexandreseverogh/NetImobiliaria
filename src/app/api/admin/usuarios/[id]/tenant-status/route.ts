import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt';
import { toggleUserTenantStatus } from '@/lib/database/users';
import { auditLogger } from '@/lib/utils/auditLogger';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const denied = await requireApiPermission(request, 'usuarios', 'UPDATE');
    if (denied) return denied;

    const userId = params.id;
    const { isActive } = await request.json();

    // 1. Verificar autenticação e extrair tenantId
    const token = getTokenFromRequest(request);
    const decoded = token ? await verifyToken(token) : null;
    const currentTenantId = decoded?.tenantId;

    if (!currentTenantId) {
      return NextResponse.json({ success: false, error: 'Contexto de empresa não encontrado' }, { status: 400 });
    }

    // 2. Executar a alteração de status no vínculo
    const success = await toggleUserTenantStatus(userId, currentTenantId, isActive);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Vínculo não encontrado para esta empresa' }, { status: 404 });
    }

    // 3. Log de Auditoria
    auditLogger.log(
      'TENANT_USER_STATUS_TOGGLE',
      `O status do usuário ${userId} foi alterado para ${isActive ? 'Ativo' : 'Bloqueado'} na empresa ${currentTenantId}`,
      true,
      'admin',
      'system',
      request.ip || 'unknown'
    );

    return NextResponse.json({
      success: true,
      message: `Usuário ${isActive ? 'ativado' : 'bloqueado'} com sucesso nesta unidade.`
    });

  } catch (error) {
    console.error('Erro ao alternar status do usuário no tenant:', error);
    return NextResponse.json({ success: false, error: 'Erro interno ao processar alteração' }, { status: 500 });
  }
}
