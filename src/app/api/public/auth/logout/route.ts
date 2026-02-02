import { NextRequest, NextResponse } from 'next/server'

/**
 * Public logout endpoint for landing page users (clientes/proprietarios)
 * Clears the public_auth_token cookie
 */
export async function POST(request: NextRequest) {
    try {
        const response = NextResponse.json({
            success: true,
            message: 'Logout realizado com sucesso'
        })

        // Remove public authentication cookie
        response.cookies.delete('public_auth_token')

        console.log('✅ Public logout: cookie public_auth_token removed')

        return response

    } catch (error) {
        console.error('❌ Erro no logout público:', error)

        return NextResponse.json(
            { success: false, message: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
