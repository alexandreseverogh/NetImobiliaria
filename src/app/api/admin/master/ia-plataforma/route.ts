import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

async function assertMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded?.is_system_role) return null;
  return decoded;
}

// GET /api/admin/master/ia-plataforma
export async function GET(request: NextRequest) {
  if (!await assertMaster(request)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const res = await pool.query(
      `SELECT "llmProvider", "llmModel", "llmApiKey", "imageProvider", "imageModel", "imageApiKey"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id IS NULL
       ORDER BY id
       LIMIT 1`
    );
    const s = res.rows[0];
    const llmKey   = s?.llmApiKey   || '';
    const imageKey = s?.imageApiKey || '';

    return NextResponse.json({
      llmProvider:        s?.llmProvider    || 'anthropic',
      llmModel:           s?.llmModel       || 'claude-sonnet-4-6',
      llmApiKeySet:       !!llmKey,
      llmApiKeyMasked:    llmKey   ? `${llmKey.slice(0, 8)}...${llmKey.slice(-4)}`   : '',
      imageProvider:      s?.imageProvider  || '',
      imageModel:         s?.imageModel     || '',
      imageApiKeySet:     !!imageKey,
      imageApiKeyMasked:  imageKey ? `${imageKey.slice(0, 8)}...${imageKey.slice(-4)}` : '',
    });
  } catch (error: any) {
    console.error('GET /master/ia-plataforma error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar configuração' }, { status: 500 });
  }
}

// PUT /api/admin/master/ia-plataforma
export async function PUT(request: NextRequest) {
  if (!await assertMaster(request)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { llmProvider, llmModel, llmApiKey, imageProvider, imageModel, imageApiKey } = body;

    const existing = await pool.query(
      `SELECT id FROM campanhasmarketingdigital."Settings" WHERE tenant_id IS NULL ORDER BY id LIMIT 1`
    );

    if (existing.rows.length > 0) {
      const setClauses: string[] = [];
      const params: any[] = [];

      if (llmProvider !== undefined) { setClauses.push(`"llmProvider" = $${params.length + 1}`);   params.push(llmProvider); }
      if (llmModel    !== undefined) { setClauses.push(`"llmModel"    = $${params.length + 1}`);   params.push(llmModel); }
      if (llmApiKey)                 { setClauses.push(`"llmApiKey"   = $${params.length + 1}`);   params.push(llmApiKey); }
      if (imageProvider !== undefined) { setClauses.push(`"imageProvider" = $${params.length + 1}`); params.push(imageProvider); }
      if (imageModel    !== undefined) { setClauses.push(`"imageModel"    = $${params.length + 1}`); params.push(imageModel); }
      if (imageApiKey)                 { setClauses.push(`"imageApiKey"   = $${params.length + 1}`); params.push(imageApiKey); }

      if (!setClauses.length) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });

      params.push(existing.rows[0].id);
      await pool.query(
        `UPDATE campanhasmarketingdigital."Settings" SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
        params
      );
    } else {
      await pool.query(
        `INSERT INTO campanhasmarketingdigital."Settings"
           (id, tenant_id, "llmProvider", "llmModel", "llmApiKey", "imageProvider", "imageModel", "imageApiKey")
         VALUES (gen_random_uuid(), NULL, $1, $2, $3, $4, $5, $6)`,
        [
          llmProvider || 'anthropic', llmModel || 'claude-sonnet-4-6', llmApiKey || '',
          imageProvider || '', imageModel || '', imageApiKey || '',
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /master/ia-plataforma error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar configuração' }, { status: 500 });
  }
}
