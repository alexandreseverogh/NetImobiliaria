-- ============================================================
-- Reconstrução da qualificação de lead por IA (/crm/config/ia)
--
-- Achado da investigação: config_segmentos/config_segmentos_inteligencia
-- eram um catálogo de "segmento" paralelo e desconectado do sistema real
-- (public.system_segments) — nunca usado por nenhum tenant real, e a
-- cascata de "global" usava tenant_id IS NULL como sentinela (as únicas
-- linhas existentes pertenciam ao tenant Master, que TEM uuid próprio,
-- então nenhum tenant real jamais batia na condição).
--
-- Esta migração:
--   1. Cria 2 tabelas novas, seguindo o MESMO modelo já comprovado de
--      system_benchmarks/system_prompt_templates (regras padrão por
--      segmento, sem tenant_id — curadas pela Master) + uma camada de
--      override por tenant (tenant_id sempre real, nunca NULL).
--   2. Adiciona system_segments.crm_ia_ativa — gate explícito, mesmo
--      padrão já usado por imagens_por_ia na mesma tabela.
--   3. Semeia o prompt mestre em system_prompt_templates (reaproveita a
--      tabela já existente — zero tabela nova pra isso).
--   4. Migra o único conteúdo real que já existia (7 regras reais,
--      presas ao tenant Master sem efeito) pro segmento real
--      "Imobiliário" — e ativa crm_ia_ativa pra esse segmento, já que
--      esta migração está fazendo, em nome da Master, a curadoria
--      inicial que faltava (evita regressão: sem isso os 3 tenants
--      reais deste segmento ficariam bloqueados no CRM assim que o
--      gate entrar em vigor).
--   5. Derruba config_segmentos/config_segmentos_inteligencia (sem FK
--      de entrada além de si mesmas — confirmado antes de migrar).
-- ============================================================

-- 1. Regras padrão por segmento (Master-curated, sem tenant_id — mesmo
--    modelo de system_benchmarks/system_prompt_templates).
CREATE TABLE public.crm_qualificacao_regras_segmento (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id      uuid NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  palavras_chave  text NOT NULL,
  tag_resultante  varchar(100) NOT NULL,
  resumo_modelo   text NOT NULL,
  score_base      integer NOT NULL DEFAULT 5,
  ordem           integer NOT NULL DEFAULT 0,
  ativa           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_qual_regras_segmento_segment ON public.crm_qualificacao_regras_segmento(segment_id, ativa);

-- 2. Regras próprias do tenant — override/adição sobre as do segmento.
--    tenant_id é SEMPRE um tenant real e concreto (nunca sentinela) —
--    esta tabela só existe pra representar "esta linha pertence a este
--    tenant de verdade", diferente da tabela acima (que não tem dono).
CREATE TABLE public.crm_qualificacao_regras_tenant (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  palavras_chave  text NOT NULL,
  tag_resultante  varchar(100) NOT NULL,
  resumo_modelo   text NOT NULL,
  score_base      integer NOT NULL DEFAULT 5,
  ordem           integer NOT NULL DEFAULT 0,
  ativa           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_crm_qual_regras_tenant_tenant ON public.crm_qualificacao_regras_tenant(tenant_id, ativa);

-- 3. Gate explícito por segmento (toggle da Master, nunca inferido).
ALTER TABLE public.system_segments
  ADD COLUMN crm_ia_ativa boolean NOT NULL DEFAULT false;

-- 4. Prompt Mestre — reaproveita system_prompt_templates (mesma tabela
--    já usada por Mensageria/Briefing). Global (qualquer segmento sem
--    curadoria própria ainda) + variante real para o segmento Imobiliário.
INSERT INTO public.system_prompt_templates (segment_id, template_key, version, title, content, variables, is_active)
VALUES
(
  NULL,
  'crm_lead_qualification',
  1,
  'Qualificação de Lead (CRM) — Global',
  'Você é um consultor de vendas especialista, atuando como a primeira triagem de um lead que acabou de chegar. Analise a mensagem abaixo e identifique a real intenção/motivação por trás dela — não apenas palavras soltas, o contexto completo.

Mensagem do lead:
{{mensagem}}

Regras táticas do negócio (vocabulário e prioridades conhecidas deste segmento — use como guia, mas confie no seu próprio julgamento quando a mensagem não bater exatamente com nenhuma delas):
{{regras_taticas}}

Responda SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{"tag_sonho": "rótulo curto da intenção/desejo detectado", "resumo_ia": "resumo de 1-2 frases para quem for atender este lead", "score_prontidao": número inteiro de 0 a 10 indicando o quão pronto este lead está para avançar agora}',
  '["mensagem", "regras_taticas"]'::jsonb,
  true
),
(
  '92e5ddd3-4f3b-4f93-9839-6168d09e25e8',
  'crm_lead_qualification',
  1,
  'Qualificação de Lead (CRM) — Imobiliário',
  'Você é um consultor imobiliário experiente, atuando como a primeira triagem de um lead que acabou de chegar. Analise a mensagem abaixo e identifique a real motivação por trás dela: é alguém buscando o primeiro imóvel, trocando de casa, investindo, querendo vender/alugar o próprio imóvel, ou algo mais específico?

Mensagem do lead:
{{mensagem}}

Regras táticas conhecidas deste segmento (vocabulário e prioridades já mapeadas — use como guia, mas confie no seu próprio julgamento quando a mensagem não bater exatamente com nenhuma delas):
{{regras_taticas}}

Responda SOMENTE com um objeto JSON válido, sem nenhum texto antes ou depois, exatamente neste formato:
{"tag_sonho": "rótulo curto da intenção/desejo detectado", "resumo_ia": "resumo de 1-2 frases para o corretor que for atender este lead", "score_prontidao": número inteiro de 0 a 10 indicando o quão pronto este lead está para avançar agora}',
  '["mensagem", "regras_taticas"]'::jsonb,
  true
);

-- 5. Migra o único conteúdo real existente (7 regras reais e não-órfãs
--    de config_segmentos_inteligencia, hoje presas ao tenant Master sem
--    nenhum efeito) para o segmento real "Imobiliário". As 7 linhas
--    órfãs (segmento_id NULL, lixo duplicado) ficam de fora de propósito.
INSERT INTO public.crm_qualificacao_regras_segmento
  (segment_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa)
SELECT
  '92e5ddd3-4f3b-4f93-9839-6168d09e25e8'::uuid,
  palavras_chave, tag_resultante, resumo_modelo, score_base,
  row_number() OVER (ORDER BY id),
  ativa
FROM public.config_segmentos_inteligencia
WHERE segmento_id = 1;

-- Esta migração está fazendo, em nome da Master, a curadoria inicial que
-- faltava para o único segmento com conteúdo real hoje — sem isso, os 3
-- tenants reais do segmento Imobiliário ficariam bloqueados no CRM assim
-- que o gate entrar em vigor.
UPDATE public.system_segments
   SET crm_ia_ativa = true
 WHERE id = '92e5ddd3-4f3b-4f93-9839-6168d09e25e8'::uuid;

-- 6. Saneamento: derruba as tabelas antigas (nenhuma FK de entrada além
--    de si mesmas, confirmado antes desta migração).
DROP TABLE public.config_segmentos_inteligencia;
DROP TABLE public.config_segmentos;
