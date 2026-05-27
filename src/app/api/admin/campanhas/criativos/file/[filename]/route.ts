import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import fs from 'fs';
import path from 'path';
import mime from 'mime';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { filename: string } }) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const sRes = await pool.query(
      `SELECT "creativesPath" FROM campanhasmarketingdigital."Settings" WHERE tenant_id = $1::uuid LIMIT 1`,
      [payload.tenantId]
    );
    const creativesPath = sRes.rows[0]?.creativesPath || process.env.CREATIVES_PATH || '';

    if (!creativesPath) {
      return NextResponse.json({ error: 'Pasta de criativos não configurada' }, { status: 404 });
    }

    const filename = decodeURIComponent(params.filename);
    // Evita path traversal
    const filePath = path.resolve(path.join(creativesPath, filename));
    if (!filePath.startsWith(path.resolve(creativesPath))) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = mime.getType(filePath) || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('GET /criativos/file error:', error);
    return NextResponse.json({ error: 'Erro ao servir arquivo' }, { status: 500 });
  }
}
