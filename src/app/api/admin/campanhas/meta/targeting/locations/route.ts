import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getNetworkServiceForTenant } from '@/lib/marketing/networks/factory';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/meta/targeting/locations?q=...
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');

    if (!q || q.trim().length < 2) {
      return NextResponse.json({ error: 'Parâmetro q obrigatório (mínimo 2 caracteres)' }, { status: 400 });
    }

    const networkService = await getNetworkServiceForTenant(payload.tenantId, 'meta');
    const locations = await networkService.searchTargeting('location', q.trim());

    return NextResponse.json(locations);
  } catch (error: any) {
    console.error('GET /meta/targeting/locations error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar localizações' }, { status: 500 });
  }
}
