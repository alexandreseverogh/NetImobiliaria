/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth/password'
import { generateTokensNode } from '@/lib/auth/jwt-node'
import { rateLimit } from '@/lib/middleware/rateLimit'
import { logAuditEvent } from '@/lib/database/audit'
import { findUserByUsername, updateLastLogin, getUserPermissions } from '@/lib/database/users'

// ForÃ§ar uso do Node.js runtime
export const runtime = 'nodejs'



export async function POST(request: NextRequest) {
  try {
    // Rate limiting por IP
    const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(clientIP, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
        { status: 429 }
      )
    }

    const { username, password } = await request.json()
    
    // ValidaÃ§Ãµes bÃ¡sicas
    if (!username || !password) {
      return NextResponse.json(
        { error: 'UsuÃ¡rio e senha sÃ£o obrigatÃ³rios' },
        { status: 400 }
      )
    }

    // ValidaÃ§Ãµes de tipo e tamanho
    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Dados invÃ¡lidos' },
        { status: 400 }
      )
    }

    if (username.trim().length < 3) {
      return NextResponse.json(
        { error: 'UsuÃ¡rio deve ter pelo menos 3 caracteres' },
        { status: 400 }
      )
    }

    if (password.trim().length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }
    
    // Buscar usuÃ¡rio no banco PostgreSQL
    const user = await findUserByUsername(username)
    
    if (!user) {
      await logAuditEvent({
        action: 'LOGIN_FAILED',
        resourceType: 'AUTH',
        details: { username, reason: 'UsuÃ¡rio nÃ£o encontrado' },
        ipAddress: clientIP
      })
      return NextResponse.json(
        { error: 'UsuÃ¡rio nÃ£o encontrado ou inativo' },
        { status: 401 }
      )
    }
    
    // Verificar senha usando bcrypt
    const isValidPassword = await verifyPassword(password, user.password)
    
    if (!isValidPassword) {
      await logAuditEvent({
        action: 'LOGIN_FAILED',
        resourceType: 'AUTH',
        details: { username, reason: 'Senha incorreta' },
        ipAddress: clientIP
      })
      return NextResponse.json(
        { error: 'Senha incorreta' },
        { status: 401 }
      )
    }
    
    // Buscar metadata do perfil do usuário
    const pool = await import('@/lib/database/connection').then(m => m.default)
    const roleQuery = `
      SELECT 
        ur.name as role_name,
        ur.level as role_level,
        ur.is_system_role
      FROM user_role_assignments ura
      JOIN user_roles ur ON ura.role_id = ur.id
      WHERE ura.user_id = $1
      ORDER BY ur.level DESC
      LIMIT 1
    `
    const roleResult = await pool.query(roleQuery, [user.id])
    const roleMetadata = roleResult.rows[0] || { role_name: 'Usuário', role_level: 1, is_system_role: false }

    // Gerar tokens JWT com metadata completa
    const tokens = generateTokensNode({
      userId: user.id,
      username: user.username,
      nome: user.nome,
      email: user.email,
      role_name: roleMetadata.role_name,
      role_level: roleMetadata.role_level,
      is_system_role: roleMetadata.is_system_role === true,
      permissoes: await getUserPermissions(user.id)
    })
    
    console.log('ðŸ” Tokens gerados:', {
      accessToken: tokens.accessToken.substring(0, 50) + '...',
      refreshToken: tokens.refreshToken.substring(0, 50) + '...'
    })

    // Atualizar Ãºltimo login e registrar sucesso
            await updateLastLogin(user.id)
    await logAuditEvent({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'AUTH',
      details: { username: user.username },
      ipAddress: clientIP
    })

    // Criar resposta com cookies seguros
    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        username: user.username,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        ativo: user.ativo
      }
    })
    
    // Configurar cookies seguros
    response.cookies.set('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: false, // false para desenvolvimento local
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 horas
      path: '/'
    })
    
    response.cookies.set('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false, // false para desenvolvimento local
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: '/'
    })
    
    console.log('ðŸ” Cookies configurados na resposta')
    
    return response
    
  } catch (error) {
    console.error('Erro no login:', error)
    
    // NÃ£o expor detalhes internos em produÃ§Ã£o
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    return NextResponse.json(
      { 
        error: isDevelopment 
          ? `Erro interno: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
          : 'Erro interno do servidor'
      },
      { status: 500 }
    )
  }
}


