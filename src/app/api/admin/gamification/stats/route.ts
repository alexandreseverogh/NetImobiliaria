
import { NextRequest, NextResponse } from 'next/server';
import { GamificationService } from '@/lib/gamification/gamificationService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'leaderboard'; // 'leaderboard' or 'transbordo'
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const search = searchParams.get('search') || undefined;

        if (type === 'leaderboard') {
            const result = await GamificationService.getLeaderboard({ page, limit, search });
            return NextResponse.json(result);
        }

        if (type === 'transbordo') {
            const list = await GamificationService.getTransbordoHistory({ page, limit, search });
            return NextResponse.json({
                data: list,
                page,
                limit
            });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    } catch (error) {
        console.error('[Gamification API] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
