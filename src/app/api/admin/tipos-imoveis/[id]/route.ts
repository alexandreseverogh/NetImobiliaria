import { NextRequest, NextResponse } from 'next/server';
import { findTipoImovelById, updateTipoImovel, toggleTipoImovelStatus, deleteTipoImovel } from '@/lib/database/tipos-imoveis';
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware';
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger';
import { extractRequestData } from '@/lib/utils/ipUtils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const tipo = await findTipoImovelById(parseInt(params.id));

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    return NextResponse.json(tipo);
  } catch (error) {
    console.error('Erro ao buscar tipo de imóvel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { nome, descricao, ativo } = await request.json();

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    // Buscar dados ANTES da atualização para auditoria
    const tipoAntes = await findTipoImovelById(parseInt(params.id));
    
    if (!tipoAntes) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    const tipo = await updateTipoImovel(parseInt(params.id), { nome, descricao, ativo });

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    // Log de auditoria com before/after (não crítico)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      // Montar objeto de mudanças
      const changes: Record<string, { before: any; after: any }> = {}
      
      if (tipoAntes.nome !== tipo.nome) {
        changes.nome = { before: tipoAntes.nome, after: tipo.nome }
      }
      if (tipoAntes.descricao !== tipo.descricao) {
        changes.descricao = { before: tipoAntes.descricao || '', after: tipo.descricao || '' }
      }
      if (tipoAntes.ativo !== tipo.ativo) {
        changes.ativo = { before: tipoAntes.ativo, after: tipo.ativo }
      }
      
      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'tipos-imoveis',
        resourceId: tipo.id,
        details: {
          description: `Atualizou tipo de imóvel "${tipo.nome}"`,
          changes,
          updated_by: userId
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

    return NextResponse.json(tipo);
  } catch (error) {
    console.error('Erro ao atualizar tipo de imóvel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { ativo } = await request.json();

    // Buscar dados ANTES da mudança para auditoria
    const tipoAntes = await findTipoImovelById(parseInt(params.id));
    
    if (!tipoAntes) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    const tipo = await updateTipoImovel(parseInt(params.id), { ativo });

    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    // Log de auditoria para mudança de status (não crítico)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      const statusAction = ativo ? 'ativou' : 'desativou'
      
      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'tipos-imoveis',
        resourceId: tipo.id,
        details: {
          description: `${statusAction.charAt(0).toUpperCase() + statusAction.slice(1)} tipo de imóvel "${tipo.nome}"`,
          changes: {
            ativo: { before: tipoAntes.ativo, after: tipo.ativo }
          },
          action_type: statusAction,
          updated_by: userId
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

    return NextResponse.json(tipo);
  } catch (error) {
    console.error('Erro ao alterar status do tipo de imóvel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // Buscar dados ANTES da exclusão para auditoria
    const tipo = await findTipoImovelById(parseInt(params.id));
    
    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    const success = await deleteTipoImovel(parseInt(params.id));

    if (!success) {
      return NextResponse.json({ error: 'Tipo de imóvel não encontrado' }, { status: 404 });
    }

    // Log de auditoria para exclusão (não crítico)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'DELETE',
        resource: 'tipos-imoveis',
        resourceId: tipo.id,
        details: {
          description: `Excluiu tipo de imóvel "${tipo.nome}"`,
          nome: tipo.nome,
          descricao: tipo.descricao || '',
          ativo: tipo.ativo,
          deleted_by: userId
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Tipo de imóvel excluído com sucesso' 
    });
  } catch (error) {
    console.error('❌ Erro ao excluir tipo de imóvel:', error);
    
    // Verificar se é erro de integridade referencial (imóveis associados)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage.includes('está sendo usado por imóveis')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          success: false
        },
        { status: 409 } // Conflict - recurso tem dependências
      );
    }
    
    if (errorMessage.includes('não encontrado') || errorMessage.includes('não foi encontrado')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          success: false
        },
        { status: 404 } // Not Found
      );
    }
    
    // Outros erros inesperados
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        success: false
      },
      { status: 500 }
    );
  }
}
