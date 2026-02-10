import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { userHasPermission } from '@/lib/database/users'

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('admin_auth_token')?.value
        if (!token) return NextResponse.json({ error: 'No token' })

        const decoded = verifyTokenNode(token)
        if (!decoded) return NextResponse.json({ error: 'Invalid token' })

        const hasPerm = await userHasPermission(decoded.userId, 'imoveis', 'READ')

        return NextResponse.json({
            status: "DEBUG_PERMISSION",
            userId: decoded.userId,
            hasPermission: hasPerm
        })
    } catch (error: any) {
        return NextResponse.json({
            status: "ERROR",
            message: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
