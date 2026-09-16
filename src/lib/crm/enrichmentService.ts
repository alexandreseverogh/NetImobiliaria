import pool from '@/lib/database/connection'
import { resolveAtivoConfig, IDENT_RE } from '@/lib/crm/resolveAtivoConfig'

/**
 * ENRICHMENT SERVICE (CRM AGNÓSTICO)
 * Este serviço é o motor Metadata-Driven que enriquece os leads com dados
 * de qualquer segmento (Imóveis, Saúde, etc) sem hardcoding.
 *
 * A config vem de resolveAtivoConfig(tenantId) — override do tenant, senão padrão do
 * segmento (docs/CHECKPOINT.md, 2026-08-14). target_table/target_fk_column já chegam
 * validados contra IDENT_RE por esse resolver, mas revalidamos aqui também (defesa em
 * profundidade, já que este serviço interpola esses valores direto em SQL cru).
 */
export class EnrichmentService {
  /**
   * Enriquece um lead com um "snapshot" de dados configurados para o segmento/tenant.
   */
  static async enrichLead(leadUuid: string, tenantId: string, sourceId: number | string | null) {
    try {
      const config = await resolveAtivoConfig(tenantId)

      if (!config) {
        console.warn(`[EnrichmentService] ⚠️ Nenhuma config de ativo pro tenant ${tenantId} (segmento sem padrão configurado ainda).`)
        return false
      }

      const { targetTable, targetNameColumn, layoutJson, formSchemaJson } = config

      // 2. Se não houver vínculo exato (sourceId nulo), processa o formulário de busca
      // genérica — nunca depende de target_table (Perfil de Interesse existe mesmo em
      // segmentos sem nenhuma tabela de inventário digitalizada ainda).
      if (!sourceId) {
        return await this.enrichGenericLead(leadUuid, formSchemaJson)
      }

      // 3. Vínculo Exato pedido (sourceId presente) — aqui sim exige uma tabela real válida.
      if (!targetTable || !targetNameColumn || !IDENT_RE.test(targetTable) || !IDENT_RE.test(targetNameColumn)) {
        console.error('[EnrichmentService] ❌ Vínculo Exato pedido mas o tenant/segmento não tem target_table configurado:', config)
        return false
      }

      // 4. Buscar os dados na tabela alvo (ex: imoveis, veiculos, etc)
      const dataRes = await pool.query(
        `SELECT * FROM ${targetTable} WHERE id = $1`,
        [sourceId]
      )

      if (dataRes.rows.length === 0) {
        console.warn(`[EnrichmentService] ⚠️ Dados não encontrados na tabela ${targetTable} para o ID ${sourceId}.`)
        return false
      }

      const row = dataRes.rows[0]
      const layout = layoutJson || {}
      const enrichedSnapshot: any = {
        title: layout.title_template || '',
        subtitle: layout.subtitle_template || '',
        badges: []
      }

      // 3. Processar Título e Subtítulo (Token Replacement: {{campo}})
      for (const key in row) {
        const token = `{{${key}}}`
        enrichedSnapshot.title = enrichedSnapshot.title.replace(new RegExp(token, 'g'), row[key] || '')
        enrichedSnapshot.subtitle = enrichedSnapshot.subtitle.replace(new RegExp(token, 'g'), row[key] || '')
      }

      // 4. Processar Badges (Labels, Ícones e Unidades)
      if (Array.isArray(layout.badges)) {
        enrichedSnapshot.badges = layout.badges.map((b: any) => {
          let rawValue = row[b.campo]
          let formattedValue = rawValue

          // Formatação básica (Agnóstica por TIPO DE ÍCONE)
          if (rawValue !== null && rawValue !== undefined) {
             if (b.icone === 'dollar-sign' && !isNaN(Number(rawValue))) {
                 formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(rawValue))
             } else if (!isNaN(Number(rawValue)) && typeof rawValue !== 'boolean' && String(rawValue).trim() !== '') {
                 // Format big numbers like Area just in case? Maybe keep simple.
                 if (typeof rawValue === 'number') {
                     formattedValue = new Intl.NumberFormat('pt-BR').format(rawValue)
                 }
             }
          }

          let prefix = b.prefixo || ''
          // Se for moeda e a formatação já injetou R$, arrancamos o prefixo pra não duplicar
          if (b.icone === 'dollar-sign' && formattedValue && String(formattedValue).includes('R$')) {
             prefix = ''
          }

          return {
            label: b.label,
            icone: b.icone,
            valor: `${prefix}${formattedValue || '---'}${b.sufixo || ''}`,
            full_width: b.full_width || false
          }
        })
      }

      // 5. Salvar Snapshot no Cache do Lead
      await pool.query(
        'UPDATE leads_staging SET enriquecimento_cache = $1, updated_at = NOW() WHERE lead_uuid = $2',
        [JSON.stringify(enrichedSnapshot), leadUuid]
      )

      console.log(`✅ [EnrichmentService] Lead ${leadUuid} enriquecido com sucesso para a tabela ${targetTable}.`)
      return true
    } catch (error) {
      console.error('[EnrichmentService] ❌ Erro crítico no enriquecimento:', error)
      return false
    }
  }

  /**
   * Re-processa todos os leads de um tenant pra aplicar retroativamente um novo layout do
   * Segment Builder (tenant override ou padrão do segmento que acabou de mudar).
   */
  static async reEnrichAllLeads(tenantId: string) {
    try {
      const config = await resolveAtivoConfig(tenantId)
      if (!config) return 0

      // Sem tabela de Vínculo Exato configurada, não há nenhum lead com sourceId pra
      // reprocessar por essa via — só Perfil de Interesse existe, e esse é resolvido no
      // momento da criação do lead (enrichGenericLead), não em lote aqui.
      const fkCol = config.targetFkColumn
      if (!fkCol || !IDENT_RE.test(fkCol)) {
        return 0
      }

      const leadsRes = await pool.query(
        `SELECT lead_uuid, ${fkCol} as source_id FROM leads_staging WHERE tenant_id = $1::uuid AND ${fkCol} IS NOT NULL`,
        [tenantId]
      )

      let successes = 0
      for (const lead of leadsRes.rows) {
        const ok = await this.enrichLead(lead.lead_uuid, tenantId, lead.source_id)
        if (ok) successes++
      }

      console.log(`[EnrichmentService] 🔄 Lote de ${successes} leads do tenant ${tenantId} atualizado retroativamente com sucesso.`)
      return successes
    } catch (err) {
      console.error('[EnrichmentService] ❌ Falha no re-enriquecimento global:', err)
      return 0
    }
  }

  /**
   * Processa o enriquecimento visual a partir da coluna raw_json baseada no schema manual
   */
  private static async enrichGenericLead(leadUuid: string, schema: any[]) {
     try {
       const res = await pool.query('SELECT raw_json FROM leads_staging WHERE lead_uuid = $1', [leadUuid])
       if (res.rows.length === 0) return false

       const rawJson = res.rows[0].raw_json || {}
       if (!schema || schema.length === 0 || Object.keys(rawJson).length === 0) {
          // Sem dados ou sem schema para renderizar
          return false
       }

       const badges = []
       for (const field of schema) {
          if (rawJson[field.name]) {
              let valorRaw = rawJson[field.name];
              let valorIcon = field.type === 'currency' ? 'dollar-sign' : 'map-pin'

              if (field.type === 'currency') {
                 // Limpa valor (se já veio mascarado com R$, ou se é numérico)
                 const limpo = String(valorRaw).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')
                 if (!isNaN(Number(limpo)) && limpo.trim() !== '') {
                     valorRaw = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(limpo))
                 }
              }

              badges.push({
                 label: field.label || field.name,
                 icone: valorIcon,
                 valor: valorRaw,
                 full_width: field.type === 'currency' // Força moeda a usar a linha toda pra não truncar "R$ 1.500.000,00"
              })
          }
       }

       if (badges.length === 0) return false

       const enrichedSnapshot = {
          title: 'Perfil de Maior Interesse',
          subtitle: 'Busca Genérica (Config manual)',
          badges
       }

       await pool.query(
         'UPDATE leads_staging SET enriquecimento_cache = $1, updated_at = NOW() WHERE lead_uuid = $2',
         [JSON.stringify(enrichedSnapshot), leadUuid]
       )

       console.log(`✅ [EnrichmentService] Lead ${leadUuid} enriquecido com Perfil Genérico em formato de Badge.`)
       return true
     } catch(e) {
       console.error('[EnrichmentService] Erro no generic lead:', e)
       return false
     }
  }
}
