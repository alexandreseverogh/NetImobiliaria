import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { getHookSaturation } from '@/lib/marketing/services/hookSaturationService';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') ?? undefined;

    const result = await getHookSaturation(payload.tenantId, clientId);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[hook-saturation]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
