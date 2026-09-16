-- F3 — Next Best Action (docs/PLANO_AGENTES_ACELERACAO_CRM.md §6)
-- 1º agente com LLM do catálogo. "Informativo" — nunca DEFENSIVE nem OFFENSIVE, só uma
-- sugestão visível na ficha do lead; nunca envia nada sozinho, nunca exige aprovação.

-- crm_agent_actions.type era varchar(10), suficiente só para 'DEFENSIVE'/'OFFENSIVE' (9 chars
-- cada). 'INFORMATIVE' tem 11 — alargado com folga para não precisar de nova migração a cada
-- rótulo futuro.
ALTER TABLE public.crm_agent_actions ALTER COLUMN type TYPE varchar(20);

-- Prompt Mestre do agente — mesma cascata segmento->global já usada por crm_lead_qualification
-- (system_prompt_templates, resolvePromptTemplate). Variante global genérica (funciona pra
-- qualquer segmento sem nenhum vocabulário específico); variante do Imobiliário com o mesmo
-- tom "consultor experiente" já usado no prompt de qualificação daquele segmento.
INSERT INTO public.system_prompt_templates (segment_id, template_key, version, title, content, variables, is_active)
VALUES
  (
    NULL,
    'crm_agent_next_best_action',
    1,
    'Próxima Ação Sugerida (CRM) — Global',
    'Você é um assistente de vendas experiente ajudando um atendente a decidir a MELHOR PRÓXIMA AÇÃO concreta para avançar este lead no funil. Baseie-se só nos dados reais abaixo — nunca invente informação que não foi dada.

Lead: {{nome_lead}}
Etapa atual do funil: {{etapa_atual}} (há {{tempo_na_etapa}})
Classificação de intenção: {{tag_sonho}} — {{resumo_ia}}
Score de Intenção (0-10): {{score_prontidao}}
Score de Fit / encaixe no perfil ideal (0-10): {{score_fit}}

Atividades já registradas com este lead (mais recente primeiro):
{{atividades_recentes}}

Responda em português, em 1 a 3 frases diretas e específicas, com a próxima ação concreta que o atendente deveria tomar agora — nunca uma recomendação genérica como "entre em contato" ou "continue o acompanhamento". Se não houver dado suficiente para uma recomendação específica, diga isso honestamente em vez de inventar. Responda só com o texto da recomendação, sem títulos nem formatação.',
    '["nome_lead", "etapa_atual", "tempo_na_etapa", "tag_sonho", "resumo_ia", "score_prontidao", "score_fit", "atividades_recentes"]'::jsonb,
    true
  ),
  (
    '92e5ddd3-4f3b-4f93-9839-6168d09e25e8',
    'crm_agent_next_best_action',
    1,
    'Próxima Ação Sugerida (CRM) — Imobiliário',
    'Você é um consultor imobiliário experiente ajudando um corretor a decidir a MELHOR PRÓXIMA AÇÃO concreta para avançar este lead rumo ao fechamento. Baseie-se só nos dados reais abaixo — nunca invente informação que não foi dada (não invente imóvel específico, valor, bairro ou prazo que não estejam nos dados).

Lead: {{nome_lead}}
Etapa atual do funil: {{etapa_atual}} (há {{tempo_na_etapa}})
Classificação de intenção: {{tag_sonho}} — {{resumo_ia}}
Score de Intenção (0-10): {{score_prontidao}}
Score de Fit / encaixe no perfil ideal (0-10): {{score_fit}}

Atividades já registradas com este lead (mais recente primeiro):
{{atividades_recentes}}

Responda em português, em 1 a 3 frases diretas e específicas, com a próxima ação concreta que o corretor deveria tomar agora (ex.: enviar opções que batem com o perfil, agendar visita, esclarecer um ponto específico da negociação) — nunca uma recomendação genérica como "entre em contato" ou "continue o acompanhamento". Se não houver dado suficiente para uma recomendação específica, diga isso honestamente em vez de inventar. Responda só com o texto da recomendação, sem títulos nem formatação.',
    '["nome_lead", "etapa_atual", "tempo_na_etapa", "tag_sonho", "resumo_ia", "score_prontidao", "score_fit", "atividades_recentes"]'::jsonb,
    true
  )
ON CONFLICT DO NOTHING;
