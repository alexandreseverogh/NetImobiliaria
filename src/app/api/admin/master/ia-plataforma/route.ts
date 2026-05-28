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
      `SELECT "llmProvider", "llmModel", "llmApiKey"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id IS NULL LIMIT 1`
    );
    const s = res.rows[0];
    const apiKey = s?.llmApiKey || '';

    return NextResponse.json({
      llmProvider:     s?.llmProvider || 'anthropic',
      llmModel:        s?.llmModel    || 'claude-sonnet-4-6',
      llmApiKeySet:    !!apiKey,
      llmApiKeyMasked: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '',
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
    const { llmProvider, llmModel, llmApiKey } = body;

    if (!llmProvider && !llmModel && llmApiKey === undefined) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    // Upsert da linha global: UPDATE se já existe, INSERT se não existe
    const existing = await pool.query(
      `SELECT id FROM campanhasmarketingdigital."Settings" WHERE tenant_id IS NULL LIMIT 1`
    );

    if (existing.rows.length > 0) {
      const setClauses: string[] = [
        `"llmProvider" = $1`,
        `"llmModel"    = $2`,
      ];
      const params: any[] = [llmProvider || 'anthropic', llmModel || 'claude-sonnet-4-6'];

      if (llmApiKey) {
        setClauses.push(`"llmApiKey" = $${params.length + 1}`);
        params.push(llmApiKey);
      }
      params.push(existing.rows[0].id);

      await pool.query(
        `UPDATE campanhasmarketingdigital."Settings"
         SET ${setClauses.join(', ')}
         WHERE id = $${params.length}`,
        params
      );
    } else {
      await pool.query(
        `INSERT INTO campanhasmarketingdigital."Settings"
           (id, tenant_id, "llmProvider", "llmModel", "llmApiKey")
         VALUES (gen_random_uuid(), NULL, $1, $2, $3)`,
        [llmProvider || 'anthropic', llmModel || 'claude-sonnet-4-6', llmApiKey || '']
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /master/ia-plataforma error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar configuração' }, { status: 500 });
  }
}
