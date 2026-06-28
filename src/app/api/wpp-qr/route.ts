import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// TEMPORÁRIO — apenas para conectar o WhatsApp em dev. Remover após pareamento.
const EVO_URL = process.env.EVOLUTION_API_URL_INTERNAL || process.env.EVOLUTION_API_URL || 'http://localhost:8081';
const EVO_KEY = process.env.EVOLUTION_API_KEY || '381Nb@729';
const INSTANCE = 'trafegopago-wpp';

export async function GET() {
  try {
    const state = await (
      await fetch(`${EVO_URL}/instance/connectionState/${INSTANCE}`, {
        headers: { apikey: EVO_KEY },
        cache: 'no-store',
      })
    ).json();

    const conn = await (
      await fetch(`${EVO_URL}/instance/connect/${INSTANCE}`, {
        headers: { apikey: EVO_KEY },
        cache: 'no-store',
      })
    ).json();

    return NextResponse.json({
      state: state?.instance?.state ?? 'unknown',
      base64: conn?.base64 ?? conn?.qrcode?.base64 ?? null,
      count: conn?.count ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
