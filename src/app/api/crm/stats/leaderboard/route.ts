import { NextRequest, NextResponse } from 'next/server'
import { GamificationService } from '@/lib/gamification/gamificationService'

/**
 * CRM LEADERBOARD API (Meritocracia Fase 3)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    const leaderboard = await GamificationService.getLeaderboard({ page, limit, search })

    return NextResponse.json({
      success: true,
      ...leaderboard
    })

  } catch (error: any) {
    console.error('ERRO API LEADERBOARD:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
