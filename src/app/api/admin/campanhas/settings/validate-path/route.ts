import { NextRequest, NextResponse } from 'next/server';
import { existsSync, statSync } from 'fs';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

// POST /api/admin/campanhas/settings/validate-path
// Body: { path: string }
// Verifica se o caminho informado existe e é uma pasta no servidor
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const dirPath = (body.path || '').trim();

    if (!dirPath) {
      return NextResponse.json({ exists: false, isDirectory: false, reason: 'empty' });
    }

    let exists = false;
    let isDirectory = false;

    try {
      exists = existsSync(dirPath);
      if (exists) {
        isDirectory = statSync(dirPath).isDirectory();
      }
    } catch {
      // Caminho inválido ou sem permissão de leitura
      exists = false;
    }

    return NextResponse.json({ exists, isDirectory });
  } catch (error: any) {
    console.error('POST /settings/validate-path error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
