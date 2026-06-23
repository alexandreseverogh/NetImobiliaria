import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { getLlmClientForCampaigns } from '@/lib/marketing/services/llmClient';
import { renderPrompt } from '@/lib/intelligence/promptRenderer';

export const dynamic = 'force-dynamic';

async function assertMaster(req: NextRequest) {
  const token = req.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded?.is_system_role) return null;
  return decoded;
}

// POST /api/admin/master/prompts/[id]/test
// Body: { variables: Record<string, string>, content?: string }
// If content is provided, tests that content directly (unsaved draft).
// Otherwise fetches from DB.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  if (!await assertMaster(request)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const start = Date.now();

  try {
    const body = await request.json().catch(() => ({}));
    const variables: Record<string, string> = body.variables ?? {};
    const draftContent: string | undefined = body.content;

    let content: string;

    if (draftContent !== undefined) {
      content = draftContent;
    } else {
      const { rows } = await pool.query(
        `SELECT content FROM public.system_prompt_templates WHERE id = $1::uuid LIMIT 1`,
        [params.id],
      );
      if (!rows.length) {
        return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 });
      }
      content = rows[0].content;
    }

    const rendered = renderPrompt(content, variables);

    // Find placeholders still unresolved
    const unresolved = [...rendered.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);

    const llm = await getLlmClientForCampaigns();
    const response = await llm.complete(rendered, 800);

    return NextResponse.json({
      ok:          true,
      rendered,
      response,
      unresolved,
      ms:          Date.now() - start,
    });
  } catch (err: any) {
    console.error('[POST /master/prompts/[id]/test]', err);
    return NextResponse.json({ error: err.message, ms: Date.now() - start }, { status: 500 });
  }
}
