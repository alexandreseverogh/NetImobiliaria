import pool from '@/lib/database/connection';
import { ConciergeService } from './conciergeService';

/**
 * 🛰️ INTELLIGENCE CRM BRIDGE (Fase 4 - Harness)
 * Responsável por orquestrar a entrada de leads no ecossistema Intelligence.
 */
export class IntelligenceCRM {
  /**
   * Ingestão holística de um lead vindo de qualquer fonte (Web, Social, Manual)
   * baseada no ID do prospect legatário.
   */
  static async ingestFromProspect(prospectId: number): Promise<{ success: boolean; uuid?: string }> {
    try {
      console.log(`[IntelligenceCRM] 🧬 Iniciando ingestão Intelligence para Prospect: ${prospectId}`);

      // 1. Buscar dados enriquecidos do prospect + detalhes do imóvel
      const q = `
        SELECT 
          ip.id, ip.id_cliente, ip.id_imovel, ip.mensagem, ip.preferencia_contato, ip.tenant_id,
          c.nome, c.email, c.telefone,
          i.titulo as imovel_titulo, i.cidade_fk, i.estado_fk,
          i.dormitorios, i.suites, i.vagas, i.area_total, i.preco_venda, i.preco_locacao,
          (SELECT string_agg(a.nome, ', ') FROM imovel_amenidades ia JOIN amenidades a ON ia.amenidade_id = a.id WHERE ia.imovel_id = i.id) as amenidades,
          (SELECT string_agg(p.nome, ', ') FROM imovel_proximidades ipr JOIN proximidades p ON ipr.proximidade_id = p.id WHERE ipr.imovel_id = i.id) as proximidades
        FROM imovel_prospects ip
        INNER JOIN clientes c ON ip.id_cliente = c.uuid
        LEFT JOIN imoveis i ON ip.id_imovel = i.id
        WHERE ip.id = $1
      `;
      const res = await pool.query(q, [prospectId]);
      
      if (res.rows.length === 0) {
        console.error(`[IntelligenceCRM] ❌ Prospect ${prospectId} não encontrado.`);
        return { success: false };
      }

      const p = res.rows[0];

      // Formatar contexto do imóvel para a IA
      const imovelContext = p.id_imovel ? `
        DADOS DO IMÓVEL SELECIONADO:
        - Título: ${p.imovel_titulo}
        - Características: ${p.dormitorios} dorms, ${p.suites} suítes, ${p.vagas} vagas
        - Área: ${p.area_total}m²
        - Valores: Venda R$ ${p.preco_venda} | Locação R$ ${p.preco_locacao}
        - Amenidades: ${p.amenidades || 'Não informadas'}
        - Proximidades: ${p.proximidades || 'Não informadas'}
      ` : 'Lead de interesse geral (sem imóvel específico selecionado).';

      // 2. Acionar Concierge IA para qualificação (Probabilística/Heurística)
      const iaResult = await ConciergeService.qualifyLead(p.mensagem, 1, p.tenant_id, {
          imovel: p.imovel_titulo,
          local: `${p.cidade_fk}/${p.estado_fk}`,
          detalhesImovel: imovelContext
      });

      // 3. Persistir na base Staging (Fase 1/3)
      // Usamos ON CONFLICT para evitar duplicidade caso o usuário clique várias vezes
      const stagingQ = `
        INSERT INTO leads_staging (
          lead_uuid, nome, email, telefone, imovel_id, 
          tag_sonho, resumo_ia, score_prontidao, 
          estado_fk, cidade_fk, status
        )
        VALUES (
          $1, $2, $3, $4, $5, 
          $6, $7, $8, 
          $9, $10, 'novo', $11
        )
        ON CONFLICT (lead_uuid) DO UPDATE SET
          resumo_ia = EXCLUDED.resumo_ia,
          tag_sonho = EXCLUDED.tag_sonho,
          score_prontidao = EXCLUDED.score_prontidao
        RETURNING lead_uuid
      `;

      const stagingRes = await pool.query(stagingQ, [
        p.id_cliente, // Usamos o UUID do cliente como chave primária de lead na staging para unificação
        p.nome,
        p.email,
        p.telefone,
        p.id_imovel,
        iaResult.tag_sonho,
        iaResult.resumo_ia,
        iaResult.score_prontidao,
        p.estado_fk,
        p.cidade_fk,
        p.tenant_id
      ]);

      const leadUuid = stagingRes.rows[0]?.lead_uuid;
      console.log(`[IntelligenceCRM] ✅ Lead sincronizado na Staging: ${leadUuid}`);

      // 4. Sincronizar com o Kanban (Se não existir)
      // O Kanban é a visão operacional da Fase 3
      try {
        await pool.query(`
          INSERT INTO leads_kanban (lead_uuid, status_id)
          VALUES ($1, (SELECT id FROM colunas_kanban WHERE nome = 'novo' LIMIT 1))
          ON CONFLICT (lead_uuid) DO NOTHING
        `, [leadUuid]);
      } catch (kanbanErr) {
        console.warn(`[IntelligenceCRM] ⚠️ Falha ao criar entrada no Kanban (não bloqueia):`, kanbanErr);
      }

      return { success: true, uuid: leadUuid };

    } catch (err) {
      console.error(`[IntelligenceCRM] ❌ Erro crítico na ingestão:`, err);
      return { success: false };
    }
  }
}
