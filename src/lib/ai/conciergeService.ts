import pool from '@/lib/database/connection';

export interface QualificationResult {
  tag_sonho: string;
  resumo_ia: string;
  score_prontidao: number;
}

export class ConciergeService {
  static async qualifyLead(mensagem: string, segmentId: number = 1, tenantId?: string, rawJson?: any): Promise<QualificationResult> {
    const text = (mensagem || '').toLowerCase().trim();
    
    let tag = 'Interesse Geral';
    let summary = 'Lead captado com interesse básico. Aguardando triagem humana.';
    let score = 5;

    if (!text && !rawJson) {
      return { tag_sonho: 'A Definir', resumo_ia: 'Lead sem mensagem de intenção.', score_prontidao: 5 };
    }

    try {
      const useGemini = !!process.env.GEMINI_API_KEY; 

      if (useGemini) {
        return await this.callGemini(mensagem, segmentId, tenantId, rawJson);
      }
      
      throw new Error("Gemini API Key missing (Using Metadata Fallback)");

    } catch (err) {
      const rulesRes = await pool.query(
        "SELECT * FROM config_segmentos_inteligencia WHERE segmento_id = $1 AND ativa = true AND (tenant_id = $2 OR tenant_id IS NULL) ORDER BY score_base DESC", 
        [segmentId, tenantId || null]
      );

      if (rulesRes.rows.length > 0) {
        for (const rule of rulesRes.rows) {
          const keywords = rule.palavras_chave.split(',').map((k: string) => k.trim().toLowerCase());
          const hasMatch = keywords.some((k: string) => text.includes(k));

          if (hasMatch) {
            tag = rule.tag_resultante;
            summary = rule.resumo_modelo;
            score = rule.score_base;
            break;
          }
        }
      }
    }

    return { tag_sonho: tag, resumo_ia: summary, score_prontidao: score };
  }

  private static async callGemini(message: string, segmentId: number, tenantId?: string, context?: any): Promise<QualificationResult> {
    try {
      const nodeRequire = eval('require');
      const { GoogleGenerativeAI } = nodeRequire('@google/generative-ai');
      
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const segmentRes = await pool.query(
        'SELECT nome, prompt_ia FROM config_segmentos WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)', 
        [segmentId, tenantId || null]
      );
      const rulesRes = await pool.query(
        'SELECT tag_resultante, resumo_modelo FROM config_segmentos_inteligencia WHERE segmento_id = $1 AND ativa = true AND (tenant_id = $2 OR tenant_id IS NULL)', 
        [segmentId, tenantId || null]
      );
      
      const segment = segmentRes.rows[0];
      const tacticalRules = rulesRes.rows.map(r => r.tag_resultante + ': ' + r.resumo_modelo).join('\n');

      let systemPrompt = segment?.prompt_ia || "Você é um especialista em vendas.";
      
      const fullPrompt = systemPrompt + "\n\nAnalise esta mensagem: " + message + "\n\nRegras do negócio:\n" + tacticalRules;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const responseText = response.text();
      
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      
      return {
        tag_sonho: parsed.tag_sonho || 'Interesse Geral',
        resumo_ia: parsed.resumo_ia || 'Análise via IA Concluída',
        score_prontidao: Number(parsed.score_prontidao) || 7
      };
    } catch (error) {
       console.error("Erro Crítico Gemini (Bypass):", error);
       throw error;
    }
  }
}
