import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import fs from 'fs';
import path from 'path';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    if (!creativesPath || !fs.existsSync(creativesPath as string)) {
      return NextResponse.json({ images: [], error: 'Pasta de criativos não configurada ou não encontrada' });
    }

    const files = fs.readdirSync(creativesPath);
    const images = files
      .filter(file => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()))
      .map(file => {
        const filePath = path.join(creativesPath, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          url: `/api/admin/campanhas/criativos/file/${encodeURIComponent(file)}`,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return NextResponse.json({ images });
  } catch (error: any) {
    console.error('GET /criativos error:', error);
    return NextResponse.json({ error: 'Erro ao listar criativos' }, { status: 500 });
  }
}
