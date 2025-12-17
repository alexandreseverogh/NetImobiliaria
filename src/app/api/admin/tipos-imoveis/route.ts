import { NextRequest, NextResponse } from 'next/server';
import { findAllTiposImovel, createTipoImovel } from '@/lib/database/tipos-imoveis';
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware';
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger';
import { extractRequestData } from '@/lib/utils/ipUtils';

export async function GET(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const tipos = await findAllTiposImovel();
    return NextResponse.json(tipos);
  } catch (error) {
    console.error('Erro ao buscar tipos de imóveis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { nome, descricao, ativo = true } = await request.json();

    if (!nome) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const tipo = await createTipoImovel({ nome, descricao, ativo });
    
    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'CREATE',
        resource: 'tipos-imoveis',
        resourceId: tipo.id,
        details: {
          nome: tipo.nome,
          descricao: tipo.descricao,
          ativo: tipo.ativo
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }
    
    return NextResponse.json(tipo, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar tipo de imóvel:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
