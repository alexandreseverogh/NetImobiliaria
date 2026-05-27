import { NextRequest, NextResponse } from 'next/server'
import { checkCNPJExists } from '@/lib/database/proprietarios'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

export async function POST(request: NextRequest) {
    // Verificar permissão
    const permissionError = await unifiedPermissionMiddleware(request)
    if (permissionError) return permissionError

    try {
        const { cnpj, excludeUuid } = await request.json()

        if (!cnpj) {
            return NextResponse.json({ error: 'CNPJ não informado' }, { status: 400 })
        }

        // Obter tenantId do token
        const token = getTokenFromRequest(request)
        const decoded = token ? await verifyToken(token) : null
        const tenantId = decoded?.tenantId

        if (!tenantId) {
            return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
        }

        const exists = await checkCNPJExists(cnpj, tenantId, excludeUuid)

        return NextResponse.json({ exists })
    } catch (error) {
        console.error('Erro ao verificar CNPJ:', error)
        return NextResponse.json({ error: 'Erro interno ao verificar CNPJ' }, { status: 500 })
    }
}
