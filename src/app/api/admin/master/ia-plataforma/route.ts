import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { GEMINI_EMBEDDING_MODEL } from '@/lib/marketing/services/llmClient';

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
      `SELECT "llmProvider", "llmModel", "llmApiKey", "imageProvider", "imageModel", "imageApiKey", "embeddingApiKey", "embeddingModel"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id IS NULL
       ORDER BY id
       LIMIT 1`
    );
    const s = res.rows[0];
    const llmKey   = s?.llmApiKey   || '';
    const imageKey = s?.imageApiKey || '';
    const embedKey = s?.embeddingApiKey || '';
    const activeEmbeddingModel = s?.embeddingModel || GEMINI_EMBEDDING_MODEL;

    // Nº real de trechos tageados com o modelo ATIVO agora — é o que a UI usa pra avisar
    // o Master, com número concreto, quanto conteúdo ficaria fora de busca se ele trocar de
    // modelo sem a rotina de reprocessamento (ainda não implementada).
    let embeddingAffectedChunks = 0;
    try {
      const chunkRes = await pool.query(
        `SELECT COUNT(*)::int AS n FROM mensageria.knowledge_chunks WHERE embedding_model = $1`,
        [activeEmbeddingModel]
      );
      embeddingAffectedChunks = chunkRes.rows[0]?.n ?? 0;
    } catch {
      // schema mensageria pode não existir em algum ambiente de teste — não bloqueia a tela
    }

    return NextResponse.json({
      llmProvider:        s?.llmProvider    || 'anthropic',
      llmModel:           s?.llmModel       || 'claude-sonnet-4-6',
      llmApiKeySet:       !!llmKey,
      llmApiKeyMasked:    llmKey   ? `${llmKey.slice(0, 8)}...${llmKey.slice(-4)}`   : '',
      imageProvider:      s?.imageProvider  || '',
      imageModel:         s?.imageModel     || '',
      imageApiKeySet:     !!imageKey,
      imageApiKeyMasked:  imageKey ? `${imageKey.slice(0, 8)}...${imageKey.slice(-4)}` : '',
      embeddingApiKeySet:    !!embedKey,
      embeddingApiKeyMasked: embedKey ? `${embedKey.slice(0, 8)}...${embedKey.slice(-4)}` : '',
      embeddingModel:         activeEmbeddingModel,
      embeddingAffectedChunks,
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
    const { llmProvider, llmModel, llmApiKey, imageProvider, imageModel, imageApiKey, embeddingApiKey, embeddingModel, confirmEmbeddingModelChange } = body;

    const existing = await pool.query(
      `SELECT id, "embeddingModel" FROM campanhasmarketingdigital."Settings" WHERE tenant_id IS NULL ORDER BY id LIMIT 1`
    );

    // Trocar o modelo de embedding NÃO revetoriza o que já foi processado (rotina de
    // reprocessamento ainda não implementada) — nunca aceita essa mudança sem confirmação
    // explícita do Master, mesmo que a UI já avise antes de mandar a requisição (defesa em
    // profundidade: a API nunca deveria confiar só no client pra uma ação com esse efeito).
    if (embeddingModel !== undefined) {
      const currentModel = existing.rows[0]?.embeddingModel || GEMINI_EMBEDDING_MODEL;
      if (embeddingModel !== currentModel && !confirmEmbeddingModelChange) {
        return NextResponse.json({
          error: 'Trocar o modelo de embedding exige confirmação explícita — o conteúdo já vetorizado com o modelo atual não é revetorizado automaticamente (rotina de reprocessamento ainda não implementada).',
          requiresConfirmation: true,
        }, { status: 409 });
      }
    }

    if (existing.rows.length > 0) {
      const setClauses: string[] = [];
      const params: any[] = [];

      if (llmProvider !== undefined) { setClauses.push(`"llmProvider" = $${params.length + 1}`);   params.push(llmProvider); }
      if (llmModel    !== undefined) { setClauses.push(`"llmModel"    = $${params.length + 1}`);   params.push(llmModel); }
      if (llmApiKey)                 { setClauses.push(`"llmApiKey"   = $${params.length + 1}`);   params.push(llmApiKey); }
      if (imageProvider !== undefined) { setClauses.push(`"imageProvider" = $${params.length + 1}`); params.push(imageProvider); }
      if (imageModel    !== undefined) { setClauses.push(`"imageModel"    = $${params.length + 1}`); params.push(imageModel); }
      if (imageApiKey)                 { setClauses.push(`"imageApiKey"   = $${params.length + 1}`); params.push(imageApiKey); }
      if (embeddingApiKey)             { setClauses.push(`"embeddingApiKey" = $${params.length + 1}`); params.push(embeddingApiKey); }
      if (embeddingModel !== undefined) { setClauses.push(`"embeddingModel" = $${params.length + 1}`); params.push(embeddingModel || null); }

      if (!setClauses.length) return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });

      params.push(existing.rows[0].id);
      await pool.query(
        `UPDATE campanhasmarketingdigital."Settings" SET ${setClauses.join(', ')} WHERE id = $${params.length}`,
        params
      );
    } else {
      await pool.query(
        `INSERT INTO campanhasmarketingdigital."Settings"
           (id, tenant_id, "llmProvider", "llmModel", "llmApiKey", "imageProvider", "imageModel", "imageApiKey", "embeddingApiKey", "embeddingModel")
         VALUES (gen_random_uuid(), NULL, $1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          llmProvider || 'anthropic', llmModel || 'claude-sonnet-4-6', llmApiKey || '',
          imageProvider || '', imageModel || '', imageApiKey || '', embeddingApiKey || '', embeddingModel || null,
        ]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /master/ia-plataforma error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar configuração' }, { status: 500 });
  }
}
