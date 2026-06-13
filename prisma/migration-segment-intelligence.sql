-- Migration: segment_intelligence prompt template
-- Data: 2026-06-12
-- Cria template para análise de inteligência de segmento (multi-cliente)
-- Variáveis são todas dinâmicas — nenhum valor hardcoded no template

INSERT INTO public.system_prompt_templates (
  segment_id,
  template_key,
  version,
  title,
  content,
  variables,
  is_active
) VALUES (
  NULL,  -- global fallback; templates segment-specific podem ser criados depois
  'segment_intelligence',
  1,
  'Inteligência de Segmento — Análise Multi-Cliente',
  $PROMPT$
Você é um especialista sênior em tráfego pago digital no mercado brasileiro.
Analise os dados estruturados abaixo e produza uma inteligência de segmento acionável.

## Contexto do Segmento
- Segmento: {{segment_name}}
- Período: {{period_label}}
- Vocabulário: lead = "{{lead_term}}", conversão = "{{conversion_term}}", produto = "{{product}}"

## Benchmarks Reais do Período (calculados dos dados dos clientes)
- CPL mediano: R$ {{cpl_median}}
- CTR mediano: {{ctr_median}}%
- CPM mediano: R$ {{cpm_median}}
- CPL ideal do segmento (meta): R$ {{cpl_ideal}}
- CPL crítico (alerta): R$ {{cpl_critical}}
- Total de {{lead_term}}s capturados: {{leads_total}}
- Verba total investida: R$ {{spend_total}}

## Dados por Cliente (do melhor ao pior CPL)
{{clients_data}}

## Padrões Detectados pelo Motor de Regras
{{patterns_detected}}

## Ângulos Criativos em Uso no Segmento
{{angles_summary}}

## Instruções de Análise
Produza uma análise com EXATAMENTE a estrutura JSON abaixo.
Seja específico, acionável e use a linguagem do segmento ({{lead_term}}, {{conversion_term}}, {{product}}).
NÃO repita os números brutos — interprete-os.
NÃO invente dados que não estejam no contexto acima.

Responda APENAS com JSON válido:
{
  "segmentDiagnosis": "string — diagnóstico geral do segmento em 2-3 frases. Qual é a saúde coletiva? Qual o padrão dominante?",
  "topPerformerInsights": ["string — o que o melhor cliente está fazendo diferente que outros poderiam replicar (máx 3 itens)"],
  "criticalAlerts": ["string — alertas que exigem ação imediata, com cliente específico nomeado (máx 3 itens, só se houver)"],
  "crossClientPatterns": ["string — padrões que aparecem em 2+ clientes simultaneamente — sinais de mercado, não de campanha (máx 4 itens)"],
  "segmentOpportunities": ["string — oportunidades não exploradas identificadas nos dados, com ângulo criativo ou público sugerido (máx 3 itens)"],
  "clientSpecificActions": [
    {
      "clientName": "string",
      "priority": "high|medium|low",
      "action": "string — ação concreta e específica para este cliente baseada nos dados"
    }
  ],
  "benchmarkContext": "string — o que os benchmarks deste período significam para o segmento? Estão saudáveis, pressionados, melhores que o esperado?"
}
$PROMPT$,
  jsonb_build_object(
    'segment_name',      'Nome do segmento de negócio',
    'period_label',      'Ex: "últimos 30 dias" ou "01/05 — 31/05"',
    'lead_term',         'Vocabulário: como o segmento chama o lead (ex: interessado, paciente)',
    'conversion_term',   'Vocabulário: como o segmento chama a conversão (ex: visita, consulta)',
    'product',           'Vocabulário: o produto/serviço do segmento (ex: imóvel, consulta médica)',
    'cpl_median',        'CPL mediano calculado dos dados reais (R$)',
    'ctr_median',        'CTR mediano calculado (%)',
    'cpm_median',        'CPM mediano calculado (R$)',
    'cpl_ideal',         'CPL ideal do segmento em system_segments.cpl_ideal',
    'cpl_critical',      'CPL crítico do segmento em system_segments.cpl_critical',
    'leads_total',       'Total de leads no período',
    'spend_total',       'Verba total no período (R$)',
    'clients_data',      'JSON estruturado dos dados por cliente',
    'patterns_detected', 'Padrões do motor de regras (aiInsights)',
    'angles_summary',    'Resumo dos ângulos criativos declarados e suas performances'
  ),
  true
);
$PROMPT$;
