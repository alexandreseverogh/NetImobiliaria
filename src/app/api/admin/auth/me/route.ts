import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { getUserWithPermissions } from '@/lib/database/userPermissions'
import pool from '@/lib/database/connection'

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

    // Buscar foto (BYTEA) e tipo_mime de forma isolada para evitar que o /auth/me "apague" a foto do localStorage
    const fotoResult = await pool.query('SELECT foto, foto_tipo_mime FROM users WHERE id = $1 LIMIT 1', [
      decoded.userId
    ])
    const rawFoto = fotoResult.rows?.[0]?.foto ?? null
    const rawFotoMime = fotoResult.rows?.[0]?.foto_tipo_mime ?? null

    let fotoBase64: string | null = null
    if (rawFoto) {
      try {
        if (Buffer.isBuffer(rawFoto)) {
          fotoBase64 = rawFoto.toString('base64')
        } else if (rawFoto instanceof Uint8Array) {
          fotoBase64 = Buffer.from(rawFoto).toString('base64')
        } else if (typeof rawFoto === 'string') {
          const s = rawFoto.trim()
          if (s.startsWith('\\x')) {
            fotoBase64 = Buffer.from(s.slice(2), 'hex').toString('base64')
          } else {
            const looksBase64 =
              s.length >= 16 && s.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(s)
            fotoBase64 = looksBase64 ? s : Buffer.from(s, 'latin1').toString('base64')
          }
        }
      } catch {
        fotoBase64 = null
      }
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
      status: userWithPermissions.ativo ? 'ATIVO' : 'INATIVO',
      foto: fotoBase64,
      foto_tipo_mime: rawFotoMime
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