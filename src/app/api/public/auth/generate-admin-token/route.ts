import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { generateAccessToken } from '@/lib/auth/jwt'
import pool from '@/lib/database/connection'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
    try {
        console.log('🔍 GENERATE-ADMIN-TOKEN - Iniciando...')

        // Verificar token público
        const publicToken = request.cookies.get('public-auth-token')?.value ||
            request.headers.get('authorization')?.replace('Bearer ', '')

        console.log('🔍 GENERATE-ADMIN-TOKEN - Token público encontrado?', !!publicToken)

        if (!publicToken) {
            console.log('❌ GENERATE-ADMIN-TOKEN - Token público não encontrado')
            return NextResponse.json({
                error: 'Token público não encontrado'
            }, { status: 401 })
        }

        // Decodificar token público
        const decoded = verifyTokenNode(publicToken)
        console.log('🔍 GENERATE-ADMIN-TOKEN - Token decodificado:', decoded)

        if (!decoded) {
            console.log('❌ GENERATE-ADMIN-TOKEN - Token público inválido')
            return NextResponse.json({
                error: 'Token público inválido'
            }, { status: 401 })
        }

        // Usar userUuid ao invés de userId (compatível com token público)
        const decodedAny = decoded as any
        const proprietarioUuid = decodedAny.userUuid || decodedAny.userId
        console.log('🔍 GENERATE-ADMIN-TOKEN - Proprietário UUID:', proprietarioUuid)

        // Buscar dados do proprietário no banco
        const query = `
      SELECT 
        p.uuid,
        p.nome,
        p.email,
        'Proprietário' as cargo
      FROM proprietarios p
      WHERE p.uuid = $1
      LIMIT 1
    `

        const result = await pool.query(query, [proprietarioUuid])

        if (result.rows.length === 0) {
            return NextResponse.json({
                error: 'Proprietário não encontrado'
            }, { status: 404 })
        }

        const proprietario = result.rows[0]

        // Gerar token admin temporário (2 horas = 7200 segundos)
        const TWO_HOURS = 2 * 60 * 60
        const adminToken = await generateAccessToken({
            userId: proprietario.uuid,
            username: proprietario.nome,
            cargo: 'Proprietário'
        }, TWO_HOURS)

        // Preparar dados do usuário para o localStorage
        const userData = {
            id: proprietario.uuid,
            uuid: proprietario.uuid,
            nome: proprietario.nome,
            email: proprietario.email,
            cargo: 'Proprietário',
            userType: 'proprietario'
        }

        // Setar cookie HTTP-only para garantir que a nova janela receba o token
        cookies().set('admin_auth_token', adminToken, {
            httpOnly: false, // Permitir acesso JS se necessário (mas ideal é true) - vamos usar false para facilitar debug se localStorage falhar
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax', // Lax permite enviar cookie em navegação top-level (window.open)
            path: '/',
            maxAge: TWO_HOURS
        })

        return NextResponse.json({
            success: true,
            adminToken,
            userData
        })

    } catch (error: any) {
        console.error('Erro ao gerar token admin temporário:', error)
        return NextResponse.json({
            error: 'Erro ao gerar token admin',
            details: error.message
        }, { status: 500 })
    }
}
