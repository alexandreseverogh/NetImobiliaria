import { NextRequest, NextResponse } from 'next/server'
import { requireMaster } from '@/lib/crm/agents/debugAuth'
import { decideRecalibrationSuggestion } from '@/lib/crm/agents/scoreRecalibrationService'

export async function POST(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { suggestionId, decision } = await request.json() as {
    suggestionId?: string; decision?: 'apply' | 'dismiss'
  }
  if (!suggestionId || (decision !== 'apply' && decision !== 'dismiss')) {
    return NextResponse.json({ error: 'suggestionId e decision (apply|dismiss) são obrigatórios' }, { status: 400 })
  }

  try {
    const result = await decideRecalibrationSuggestion(suggestionId, decision)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao decidir' }, { status: 400 })
  }
}
