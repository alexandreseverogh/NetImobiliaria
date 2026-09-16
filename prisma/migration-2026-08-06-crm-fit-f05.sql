-- F0.5 — Score de Fit (ICP), docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.1/§4.
--
-- Separa "quão engajado o lead parece" (intenção, já existe: score_prontidao) de "quão bem
-- esse lead se encaixa no perfil ideal do negócio" (fit, novo). Réplica byte-a-byte do modelo
-- já usado e testado por crm_qualificacao_regras_segmento/_tenant — segmento sem tenant_id
-- (curadoria da Master, sem "dono"), tenant sempre com tenant_id real.

CREATE TABLE public.crm_fit_criterios_segmento (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id  uuid NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  criterio    text NOT NULL,
  peso        integer NOT NULL DEFAULT 5,
  ordem       integer NOT NULL DEFAULT 0,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_fit_criterios_tenant (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  criterio    text NOT NULL,
  peso        integer NOT NULL DEFAULT 5,
  ordem       integer NOT NULL DEFAULT 0,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Aditivo — score_prontidao não muda de nome nem de sentido, zero regressão nos consumidores
-- já existentes desse campo (Kanban, dashboards, ROI). NULL = nunca avaliado ainda (nunca um
-- 0 fabricado) — distingue "sem dado" de "fit ruim".
ALTER TABLE public.leads_staging ADD COLUMN score_fit INTEGER;

-- Prompt Mestre ganha a seção de critérios de fit + o 4º campo no JSON de saída — mesma
-- chamada de LLM já existente (getLlmClient/qualifyWithLlm), sem custo/latência extra.
UPDATE public.system_prompt_templates
   SET content = 'Você é um consultor de vendas especialista, atuando como a primeira triagem de um lead que acabou de chegar. Analise a mensagem abaixo e identifique a real intenção/motivação por trás dela — não apenas palavras soltas, o contexto completo.

Mensagem do lead:
{{mensagem}}

Regras táticas do negócio (vocabulário e prioridades conhecidas deste segmento — use como guia, mas confie no seu próprio julgamento quando a mensagem não bater exatamente com nenhuma delas):
{{regras_taticas}}

Critérios de encaixe no perfil ideal de cliente deste negócio (avalie SEPARADAMENTE da intenção — um lead pode estar muito engajado mas fora do perfil ideal, ou o contrário; se não houver informação suficiente na mensagem pra avaliar algum critério, não invente nem penalize, considere neutro):
{{criterios_fit}}

Responda SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{"tag_sonho": "rótulo curto da intenção/desejo detectado", "resumo_ia": "resumo de 1-2 frases para quem for atender este lead", "score_prontidao": número inteiro de 0 a 10 indicando o quão pronto este lead está para avançar agora, "score_fit": número inteiro de 0 a 10 indicando o quão bem este lead se encaixa no perfil ideal de cliente, com base nos critérios acima}',
       updated_at = now()
 WHERE template_key = 'crm_lead_qualification' AND segment_id IS NULL;

UPDATE public.system_prompt_templates
   SET content = 'Você é um consultor imobiliário experiente, atuando como a primeira triagem de um lead que acabou de chegar. Analise a mensagem abaixo e identifique a real motivação por trás dela: é alguém buscando o primeiro imóvel, trocando de casa, investindo, querendo vender/alugar o próprio imóvel, ou algo mais específico?

Mensagem do lead:
{{mensagem}}

Regras táticas conhecidas deste segmento (vocabulário e prioridades já mapeadas — use como guia, mas confie no seu próprio julgamento quando a mensagem não bater exatamente com nenhuma delas):
{{regras_taticas}}

Critérios de encaixe no perfil ideal de cliente deste negócio (avalie SEPARADAMENTE da intenção — um lead pode estar muito engajado mas fora do perfil ideal, ou o contrário; se não houver informação suficiente na mensagem pra avaliar algum critério, não invente nem penalize, considere neutro):
{{criterios_fit}}

Responda SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{"tag_sonho": "rótulo curto da intenção/desejo detectado", "resumo_ia": "resumo de 1-2 frases para o corretor que for atender este lead", "score_prontidao": número inteiro de 0 a 10 indicando o quão pronto este lead está para avançar agora, "score_fit": número inteiro de 0 a 10 indicando o quão bem este lead se encaixa no perfil ideal de cliente, com base nos critérios acima}',
       updated_at = now()
 WHERE template_key = 'crm_lead_qualification' AND segment_id = '92e5ddd3-4f3b-4f93-9839-6168d09e25e8';
