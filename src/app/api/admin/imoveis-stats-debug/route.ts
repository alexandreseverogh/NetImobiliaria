import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

import { getImoveisStats } from '@/lib/database/imoveis'

export async function GET(request: NextRequest) {
    try {
        console.log("Testing getImoveisStats...")
        const stats = await getImoveisStats()
        return NextResponse.json({
            status: "DEBUG_STATS_SUCCESS",
            stats
        })
    } catch (error: any) {
        return NextResponse.json({
            status: "DEBUG_STATS_ERROR",
            message: error.message,
            stack: error.stack
        }, { status: 500 })
    }
}
