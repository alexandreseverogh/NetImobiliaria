import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { getTokenFromRequest } from '@/lib/auth/jwt'
import { getUserWithPermissions } from '@/lib/database/userPermissions'
import pool from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    // Verificar token usando verifyTokenNode (correto para Base64URL)
    const decoded = verifyTokenNode(token)

    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { error: 'Token de autenticação inválido ou expirado' },
        { status: 401 }
      )
    }

    // SUPORTE A PROPRIETÁRIOS
    // Se o token for de um proprietário, buscar na tabela proprietarios
    const decodedAny = decoded as any
    // Verificar cargo ou userType (dependendo de como foi gerado)
    if (decoded.cargo === 'Proprietário' || decodedAny.userType === 'proprietario') {
      const propResult = await pool.query(
        'SELECT uuid, nome, email, telefone FROM proprietarios WHERE uuid = $1 LIMIT 1',
        [decoded.userId]
      )

      if (propResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Proprietário não encontrado' },
          { status: 404 }
        )
      }

      const proprietario = propResult.rows[0]

      return NextResponse.json({
        success: true,
        user: {
          id: proprietario.uuid,
          username: proprietario.email,
          nome: proprietario.nome,
          email: proprietario.email,
          telefone: proprietario.telefone,
          role_name: 'Proprietário',
          role_description: 'Proprietário de Imóveis',
          role_level: 0,
          permissoes: {}, // Proprietário tem acesso restrito implícito
          status: 'ATIVO',
          foto: null,
          foto_tipo_mime: null,
          userType: 'proprietario' // Identificador útil para o frontend
        }
      })
    }

    // Buscar usuário interno com permissões do banco de dados (SISTEMA ROBUSTO)
    const tenantIdFromToken = decodedAny.tenantId || decodedAny.tenant_id || null;
    const userWithPermissions = await getUserWithPermissions(decoded.userId, tenantIdFromToken)

    if (!userWithPermissions) {
      return NextResponse.json(
        { error: 'Usuário não encontrado ou inativo' },
        { status: 404 }
      )
    }

    // Foto removida temporariamente pois as colunas não existem no banco atual
    const fotoBase64 = null
    const rawFotoMime = null

    // Construir resposta com dados do banco
    const userResponse = {
      id: userWithPermissions.id,
      username: userWithPermissions.username,
      nome: userWithPermissions.nome,
      email: userWithPermissions.email,
      telefone: userWithPermissions.telefone,
      role_name: userWithPermissions.role_name || 'Usuário',
      role_description: userWithPermissions.role_description || 'Usuário do sistema',
      role_level: userWithPermissions.role_level || 0,  // Nível hierárquico
      is_system_role: (userWithPermissions as any).is_system_role === true, // Master/platform admin
      permissoes: userWithPermissions.permissoes || {},
      auditConfigs: (userWithPermissions as any).auditConfigs || {},
      status: userWithPermissions.ativo ? 'ATIVO' : 'INATIVO',
      foto: fotoBase64,
      foto_tipo_mime: rawFotoMime,
      currentTenant: userWithPermissions.currentTenant || null
    }

    return NextResponse.json({
      success: true,
      user: userResponse
    })

  } catch (error) {
    console.error('❌ ERRO ao verificar usuário:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
    console.error('❌ Mensagem:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}