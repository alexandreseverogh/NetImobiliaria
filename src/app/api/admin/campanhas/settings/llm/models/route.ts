import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

export interface LlmModelRow {
  id: string;
  provider: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  baseUrl: string | null;
  qualityScore: number;
  isFree: boolean;
  contextWindow: number | null;
  isRecommended: boolean;
  notes: string | null;
}

// GET /api/admin/campanhas/settings/llm/models
// Retorna todos os modelos ativos, agrupados por provider
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const res = await pool.query(
      `SELECT
         id,
         provider,
         provider_label   AS "providerLabel",
         model_id         AS "modelId",
         model_label      AS "modelLabel",
         base_url         AS "baseUrl",
         quality_score    AS "qualityScore",
         is_free          AS "isFree",
         context_window   AS "contextWindow",
         is_recommended   AS "isRecommended",
         notes
       FROM campanhasmarketingdigital."LlmModel"
       WHERE is_active = true
       ORDER BY sort_order ASC, model_label ASC`
    );

    // Agrupa por provider
    const byProvider: Record<string, { label: string; models: LlmModelRow[] }> = {};
    for (const row of res.rows) {
      if (!byProvider[row.provider]) {
        byProvider[row.provider] = { label: row.providerLabel, models: [] };
      }
      byProvider[row.provider].models.push(row);
    }

    return NextResponse.json({
      providers: byProvider,
      flat: res.rows,
    });
  } catch (error: any) {
    console.error('GET /settings/llm/models error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao listar modelos' }, { status: 500 });
  }
}
