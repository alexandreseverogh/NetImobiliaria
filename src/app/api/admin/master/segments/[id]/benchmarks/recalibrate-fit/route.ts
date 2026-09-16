import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { computeFitThresholdSuggestion } from '@/lib/marketing/services/benchmarkRecalibrationService';

/**
 * GET /api/admin/master/segments/[id]/benchmarks/recalibrate-fit
 *
 * Calcula (sob demanda, nunca persiste) uma sugestão de novo valor para o benchmark
 * avg_fit_scale_min, baseada na correlação real entre score_fit e negócio fechado no CRM —
 * ver src/lib/marketing/services/benchmarkRecalibrationService.ts pro racional completo.
 *
 * Query params: janelaDias (opcional, default 90).
 * Acesso restrito a Master (is_system_role).
 */
export const dynamic = 'force-dynamic';

async function getPayload(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  return token ? await verifyToken(token) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const decoded = await getPayload(request);
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const janelaDias = Math.min(365, Math.max(7, parseInt(searchParams.get('janelaDias') || '90', 10) || 90));

  try {
    const suggestion = await computeFitThresholdSuggestion(params.id, janelaDias);
    return NextResponse.json(suggestion);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao calcular recalibração' }, { status: 500 });
  }
}
