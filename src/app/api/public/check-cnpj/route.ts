import { NextRequest, NextResponse } from 'next/server'
import { checkCNPJExists as checkProprietarioCNPJ } from '@/lib/database/proprietarios'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { cnpj, userType } = body
        const cnpjStr = String(cnpj || '')

        if (!cnpj) {
            return NextResponse.json(
                { error: 'CNPJ é obrigatório' },
                { status: 400 }
            )
        }

        if (userType !== 'proprietario') {
            // Clientes não possuem CNPJ, então retornamos que não existe (ou erro se preferir)
            return NextResponse.json({ exists: false })
        }

        const exists = await checkProprietarioCNPJ(cnpjStr)

        return NextResponse.json({ exists })
    } catch (error) {
        console.error('❌ Erro ao verificar CNPJ público:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}
