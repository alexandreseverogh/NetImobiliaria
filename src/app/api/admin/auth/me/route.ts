import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { getUserWithPermissions } from '@/lib/database/userPermissions'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
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

    // Buscar usuário com permissões do banco de dados (SISTEMA ROBUSTO)
    const userWithPermissions = await getUserWithPermissions(decoded.userId)
    
    if (!userWithPermissions) {
      return NextResponse.json(
        { error: 'Usuário não encontrado ou inativo' },
        { status: 404 }
      )
    }

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
      permissoes: userWithPermissions.permissoes || {},
      status: userWithPermissions.ativo ? 'ATIVO' : 'INATIVO'
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