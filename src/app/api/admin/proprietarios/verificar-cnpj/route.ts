import { NextRequest, NextResponse } from 'next/server'
import { checkCNPJExists } from '@/lib/database/proprietarios'
import { UnifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

export async function POST(request: NextRequest) {
    // Verificar permissão
    const permissionError = await UnifiedPermissionMiddleware(request, 'proprietarios', 'READ')
    if (permissionError) return permissionError

    try {
        const { cnpj, excludeUuid } = await request.json()

        if (!cnpj) {
            return NextResponse.json({ error: 'CNPJ não informado' }, { status: 400 })
        }

        const exists = await checkCNPJExists(cnpj, excludeUuid)

        return NextResponse.json({ exists })
    } catch (error) {
        console.error('Erro ao verificar CNPJ:', error)
        return NextResponse.json({ error: 'Erro interno ao verificar CNPJ' }, { status: 500 })
    }
}
