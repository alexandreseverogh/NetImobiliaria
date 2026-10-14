# Plano de Ação — Integração do Jev (TypeSafe AI) na Plataforma

> **Status:** planejamento — nenhuma linha de código ou configuração alterada até aqui.
> **Escopo:** os 3 módulos que invocam LLM na plataforma — **Gestão de Mensageria**, **Campanhas
> de Marketing Digital** e **Agentes de Aceleração do CRM**.
> **Regra inegociável desta frente (ratificada pelo usuário):** é **terminantemente proibido**
> existir qualquer coisa hardcoded para o Jev obedecer/classificar/decidir — toda opção de
> Choice, toda escala de Score, toda afirmação de Noul precisa ser parametrizável, com cascata
> Master(segmento) → Tenant → Cliente, igual ao resto da plataforma (§5 é a seção central deste
> documento e resolve exatamente essa exigência, ponto a ponto).
> **Pré-requisito de confiabilidade:** ver §0 antes de prosseguir com qualquer decisão de orçamento
> ou cronograma — parte do que se sabe sobre a API do Jev vem de fontes terceiras não confirmadas.

---

## §0 — Ressalva de confiabilidade (ler antes de orçar qualquer coisa)

A pesquisa feita para este plano **não conseguiu acessar a documentação oficial** (`docs.typesafe.ai`
retornou inacessível na tentativa). O que se sabe hoje:

- **Confirmado de forma independente:** a empresa TypeSafe AI existe; o produto se chama **Jev**.
- **Vem só de fontes terceiras (blogs/agregadores, não a doc oficial)**, e precisa ser **validado
  diretamente com a TypeSafe antes de qualquer compromisso de prazo/custo**:
  - Endpoint `POST https://api.typesafe.ai/v1/systemone`, auth via Bearer API key.
  - Não é compatível com o formato OpenAI (`/chat/completions`, `messages[]`) — é um contrato próprio.
  - Preço citado: US$ 0,042 / milhão de tokens de entrada; saída seria gratuita.
  - Latência 70–500ms — **claim do próprio vendor**, não verificado por terceiros.
  - Em torno de 22–24/set/2026, cadastro direto estaria em waitlist; haveria rotas alternativas
    via Vercel AI Gateway (`typesafe-ai/jev`), OpenRouter (`~typesafe/jev-latest`) e um endpoint
    pass-through no LiteLLM.
  - Model IDs: `jev-latest` (resolveria para `jev-1.13.0`) e `jev-preview`.
  - **Não há confirmação de que o Jev aceite input multimodal (imagem)** — relevante para a
    adoção em Vision de criativos (§6, Fase 3).

Algumas dessas fontes têm sinais de conteúdo gerado em massa. **Ação obrigatória antes da
Fase 0:** confirmar contrato de API real direto em `console.typesafe.ai` ou com o time comercial
da TypeSafe, nunca com base só nesses blogs.

### Os 3 pilares reais

| Pilar | O que faz | Retorno |
|---|---|---|
| **Choice** | Escolhe 1 opção entre até 255 definidas por quem chama | Opção escolhida + distribuição de probabilidade entre as opções + score de confiança 0–1 |
| **Score** | Posiciona a entrada numa escala ordenada (2 a N níveis) | Distribuição de probabilidade por nível, redutível a uma posição normalizada 0–1 |
| **Noul** | Responde uma afirmação binária (sim/não) | Um único float 0–1 (sem campo de confiança separado) |

"Ranking" não é um 4º pilar — é um caso de uso composto de Score e/ou Choice. O Jev não
substitui o LLM generativo principal — entra como camada de decisão tipada, paralela, só nos
pontos em que a saída precisa ser um valor estruturado.

---

## §1 — Arquitetura de LLM compartilhada pela plataforma

Factory único em `src/lib/marketing/services/llmClient.ts`. `getLlmClient(tenantId?, clientId?)`
— cascata de 4 níveis (cliente→tenant→segmento→global), usada por Mensageria e CRM.
`getLlmClientForCampaigns()` — config global única, usada só por Campanhas.
`invokeForContext`/`invokeWithTemplate` (em `src/lib/intelligence/llmInvoker.ts`) resolvem o
prompt via `resolvePromptTemplate` (cascata cliente→tenant→segmento→global) e chamam o factory
de Campanhas por trás — é o caminho usado por quase tudo em Campanhas.

**Exceção:** `creativeAnalysisService.ts` (Vision de criativos) tem implementação própria
(`callVisionLlm()`), lendo config direto da `Settings` global — não passa por nenhum dos 2
factories. Não há streaming em nenhum lugar da plataforma.

---

## §2 — Mapa completo de invocação de LLM, por módulo

### 2.1 Módulo de Mensageria

| # | Arquivo | Função | O que faz | Vai direto ao usuário final? |
|---|---|---|---|---|
| 1 | `src/lib/mensageria/botAdapter.ts` | `runBotReply()` | Loop de tool-use (até 3 rodadas) que gera a resposta do bot | **Sim, sem aprovação humana** |
| 2 | `src/lib/mensageria/botAdapter.ts` | `buildCards()` | Formatação de cartões por item, mesma persona | **Sim, sem aprovação humana** |
| 3 | `src/lib/mensageria/tools/knowledgeBase.ts` | `searchKnowledge()` | Embedding da pergunta do visitante, para busca vetorial no RAG | Indireto (alimenta #1) |
| 4 | `src/lib/mensageria/tools/knowledgeBase.ts` | ingestão de documentos | Embedding na indexação de documentos da base de conhecimento | Não (batch) |

**Pipeline real:** `ingest.ts` → `maybeRunBot()` → `runBotReply()` (LLM entra aqui) → **[espaço
livre hoje]** → `ingestMessage()` (reentrada outbound) → `deliverIfWhatsApp()`. O objeto
`BotReply` já pronto existe entre o retorno de `runBotReply()` e o envio — ponto de inserção de
menor esforço para um gate pós-geração. Tool-use é **100% dirigido por dado**: cada entidade
ativa em `mensageria.segment_data_entities` gera dinamicamente `buscar_<entidade>`,
`comparar_<entidade>`, `agrupar_<entidade>` (confirmado em `genericResolver.ts`, linhas
672-699 — `e.entityName` vem do banco, nenhum nome de entidade hardcoded).

### 2.2 Módulo de Campanhas de Marketing Digital

| # | Arquivo | Função / `templateKey` | O que faz | Decisão já é determinística antes do LLM? |
|---|---|---|---|---|
| 1 | `agentDecisor.ts` | `enrichWithClaude()` · `agent_enrich` | Reescreve só o texto `description` de um insight já decidido | **Sim** — `insight.type` nunca muda |
| 2 | `aiInsights.ts` | `RULES`/`SIGNAL_RULES` | Decide PAUSE/SCALE/ALERT/OPTIMIZE/DOWNSCALE/etc. | **Zero LLM no arquivo** |
| 3 | `strategicBriefing.ts` | `generateStrategicBriefing()` · `briefing_*` | Narrativa estruturada em JSON a partir de métricas já agregadas | Narrativa livre; fallback 100% rule-based |
| 4 | `creativeAnalysisService.ts` | `analyzeCreativeAsset()` → `callVisionLlm()` · `creative_vision_analysis` | Vision extrai `hook_type`/`angle`/`cta_style`/`emotional_tone`/booleanos | **Não** — é o LLM quem classifica |
| 5 | `creativeAnalysisService.ts` | `generateCreativeConcepts()`/`generateVisualHookSuggestions()` | Conceitos/sugestões de hook (texto livre) | N/A |
| 6 | `angleClassifierService.ts` | `classifyBatch()` · `classify_campaign_angle` | Classifica até 200 campanhas em lotes de 20, por ângulo + confiança categórica | **Não** — decisão categórica pelo LLM |
| 7 | `segmentAngleSuggestionService.ts` | `invokeWithTemplate` · `segment_angles_suggestion` | LLM propõe ângulos + termos Trends para um segmento | Sugestão de lista, Master confirma |
| 8 | `segmentInterestSuggestionService.ts` | `invokeWithTemplate` | LLM propõe interesses Meta por segmento | Sugestão de lista, Master confirma |
| 9 | `auditReportService.ts` | `generateNarrative()` · `audit_report_*` | Narrativa de auditoria sobre scorecard já calculado | Sim — cálculo determinístico |
| 10-13 | 4 rotas de narrativa (funil/ângulo/desperdício/iniciativa) | `invokeForContext` | Narrativa livre sobre dado agregado | Sim |

### 2.3 Agentes de Aceleração do CRM

| Agente | Usa LLM? | Detalhe |
|---|---|---|
| `pendencia_atendimento` | **Não** | 100% SQL/regras de tempo |
| `stage_stagnation` | **Não** | 100% SQL (SLA kanban) |
| `next_best_action` | **Sim** | `crm_agent_next_best_action` · `llm.complete(prompt, 1500)` texto livre · `confidence: 1` **hardcoded** · `type: 'INFORMATIVE'`, nunca passa por gate |
| `reactivation` | **Sim** | `crm_agent_reactivation_message` · mesmo padrão · `type` condicional a `requer_revisao_extra` por segmento: `true`→`OFFENSIVE` (PIN); `false`→`DEFENSIVE` (envia automático, sem gate) |
| `score_recalibration` | **Não** | Confirmado por ausência total de import de LLM — 271 linhas, só `pool`/`resolveEffectiveAgentConfig` |

---

## §3 — Candidatos aos 3 pilares, ranqueados por clareza/valor

| Prior. | Módulo | Local | Pilar | Pré-requisito de hardcode a resolver primeiro (ver §5) |
|---|---|---|---|---|
| 1 | Campanhas | `angleClassifierService.ts` | **Choice** | **Sim — crítico.** Hoje usa `angles.ts` (8 valores fixos), não `segment_angle_terms` |
| 2 | Campanhas | `creativeAnalysisService.ts` (`hook_type`/`angle`/`cta_style`) | **Choice** | **Sim — crítico.** `hook_type` hardcoded em TS; `angle` é uma 3ª fonte desalinhada; `cta_style` sem enum algum |
| 3 | Campanhas | `creativeAnalysisService.ts` (5 campos booleanos) | **Noul** | Sim — precisa de catálogo de "quais checagens aplicam a este segmento" (hoje são 5 fixas, iguais pra todos) |
| 4 | CRM | `reactivationAgent.ts` (gate de aprovação) | **Score** | Sim — `CrmAgentParamHint` não suporta escala estruturada ainda |
| 5 | Mensageria | `botAdapter.ts` (pós-`runBotReply`) | **Noul** | Não há infra hoje — tudo novo, mas o padrão de reuso já existe (`bot_flows.handoff_rules`) |
| 6 | Mensageria | `botAdapter.ts` (pós-`runBotReply`) | **Score** | Idem #5 |
| 7 | CRM | `nextBestActionAgent.ts` | **Score** | Mesma extensão de #4 |
| 8 | Mensageria | roteamento de intenção pré-tool-use | **Choice** | **Não — já é zero-hardcode** (`segment_data_entities` já é dirigido por dado) |

**Não são candidatos** (100% determinístico/estatístico): `aiInsights.ts`, `scoreRecalibrationService.ts`,
`pendencia_atendimento`, `stage_stagnation`. **Não são candidatos — texto livre, não decisão:**
`enrichWithClaude`, `strategicBriefing.ts`, `auditReportService.ts`, as 4 rotas de narrativa.

---

## §4 — Estratégia de arquitetura de integração

Não existe um único ponto de interceptação que cubra os 3 módulos de forma transparente:
`getLlmClient()` (Mensageria/CRM) e `getLlmClientForCampaigns()` (Campanhas) são 2 pontos
distintos, e `creativeAnalysisService.ts` (Vision) não passa por nenhum dos dois. Recomendação:
**3 pontos de integração explícitos** — decorator em cada factory para os casos de "gate
pós-geração" (Mensageria, reativação do CRM), e chamada direta dentro de `classifyBatch()`/
`analyzeCreativeAsset()` para os casos de "substituição de extração categórica" (que não se
beneficiam de interceptar uma resposta já gerada — a própria extração precisa trocar de método).

Novo client dedicado `src/lib/marketing/services/jevClient.ts` — **não reaproveita**
`postChatCompletion`/`makeAnthropicClient`/`callVisionLlm`, porque o contrato do Jev não é
compatível com nenhum dos formatos já suportados.

---

## §5 — Parametrização zero-hardcode: onde cada peça será curada, em qual UI

Esta é a seção central deste documento, em resposta direta à exigência ratificada: **nenhuma
opção de Choice, escala de Score ou afirmação de Noul pode existir fixa em código**. Antes de
desenhar UI nova, é preciso separar 2 coisas:

1. **Padrões já comprovados na plataforma**, reutilizáveis sem UI nova.
2. **Lacunas reais de hardcode já existentes hoje**, independentes do Jev, que são
   **pré-requisito bloqueante** — adotar Jev sobre uma fonte de opções já hardcoded não resolve
   nada, só move o hardcode de lugar.

### 5.1 Os 4 padrões já estabelecidos no código (confirmados, não hipotéticos)

| Padrão | Quando usar | Exemplo real já existente | Cascata |
|---|---|---|---|
| **A — Coluna escalar em `system_segments`** | 1 valor único por segmento (threshold, toggle, número) | `chatbot_max_turns_default INTEGER` (`migration-2026-07-10-segment-chatbot-max-turns.sql`) | Segmento → tenant via override específico do consumidor |
| **B — Tabela satélite segmento+tenant, 1 linha por regra/opção** | **LISTA de opções** — exatamente o que Choice precisa; também serve pra regras de Score com threshold próprio | `segment_angle_terms` (`segment_id, angle_slug, angle_label, search_term, weight`), `crm_qualificacao_regras_segmento/tenant`, `crm_fit_criterios_segmento/tenant` | Segmento (Master cura) → tenant (override, replace-all) |
| **C — JSONB livre em `system_segments` ou tabela satélite** | Estrutura heterogênea/aninhada, evita migração a cada campo novo | `system_segments.network_defaults` (JSONB, já com array real seedado: `special_ad_categories`) · `crm_agentes_config_segmento.params` (JSONB) | Mesma de A/B, dependendo de onde a coluna vive |
| **D — Prompt versionado em `system_prompt_templates`** | O que varia por segmento é o **texto** da pergunta/instrução (ex. a afirmação exata que se faz ao Noul) | `mensageria_bot_persona`, `agent_enrich`, `creative_vision_analysis` | Cliente → tenant → segmento → global, UI já pronta (`/admin/master/prompts`) |

### 5.2 Pré-requisitos reais a corrigir antes do Jev — ✅ TODOS CORRIGIDOS E TESTADOS (2026-10-14)

> Os 5 pré-requisitos abaixo (P1-P5) foram implementados e testados rigorosamente com dado real
> nesta sessão, antes de qualquer adoção do Jev propriamente dita (que segue bloqueada pela
> Fase 0, validação de acesso à API — ver §0/§6). Detalhe de cada correção, achados incidentais
> e evidência de teste ponta a ponta: ver `docs/CHECKPOINT.md`, entrada "Correção dos 5
> pré-requisitos de hardcode legado (P1-P5)".

| # | Status | Resumo da correção |
|---|---|---|
| P1 | ✅ | `angleClassifierService.ts` agrupa campanhas por segmento real e monta as opções de Choice a partir de `segment_angle_terms`, nunca mais `angles.ts` (8 valores fixos). Bug pré-existente de brinde corrigido (`id = ANY($2::uuid[])` numa coluna `text`, nunca funcionava via `campaignIds` explícito). |
| P2 | ✅ | `POST`/`PATCH /campaigns` validam `declaredAngle` via `normalizeAngleForScope` (novo `angleResolver.ts`), ciente de segmento — não mais os 8 valores fixos. Testado o caso decisivo: ângulo legado válido no código antigo (`luxury`) agora é corretamente rejeitado para um segmento com taxonomia própria. UI (`CampanhasModal.tsx`: `AngleBadge` + `ClassifyModal`) atualizada para usar as opções reais por campanha. |
| P3 | ✅ | 3 tabelas novas (`segment_hook_type_terms`, `segment_cta_style_terms`, `segment_creative_boolean_checks`), com backfill de todo segmento ativo (zero regressão). `creativeAnalysisService.ts` (Vision) unifica `angle` com `segment_angle_terms`, resolve `hook_type`/`cta_style` por segmento (nunca mais `VALID_HOOK_TYPES` hardcoded nem `cta_style` sem validação nenhuma), injeta as opções reais no prompt. `hookSaturationService.ts` tinha a MESMA taxonomia duplicada hardcoded (`REAL_HOOK_TYPES`) — corrigida também, pelo mesmo mecanismo. `emotional_tone` deliberadamente deixado de fora (decisão de produto pendente, §8 item 4). |
| P4 | ✅ | `CrmAgentParamHint` ganhou `type: 'choice'\|'score'` + `options`/`levels`. Aplicado no parâmetro real `requer_revisao_extra` do `reactivationAgent.ts` (antes texto livre comparado com igualdade estrita de string — risco real de digitação incorreta num segmento sensível). UI (Master `SegmentAgentesModal.tsx` + tenant `/crm/config/agentes`) renderiza `<select>` estruturado. Testado round-trip real em produção (5 agentes do segmento Imobiliário), restaurado byte-exato. |
| P5 | ✅ | Confirmado: `/crm/config/agentes` existe. |

### 5.2b Pré-requisitos reais a corrigir antes do Jev (histórico — descrição original da investigação)

| # | Problema confirmado | Arquivo | Correção necessária |
|---|---|---|---|
| P1 | `angleClassifierService.ts` monta o Choice de ângulo usando `normalizeAngle()` de `src/lib/marketing/angles.ts` (8 valores fixos: investment/lifestyle/family/price/urgency/social/luxury/other) — **nunca lê `segment_angle_terms`**, nem recebe `segmentId` como parâmetro | `angleClassifierService.ts:13,99` | Passar `segmentId` para `classifyBatch()`; montar as opções do Choice a partir de `segment_angle_terms` do segmento da campanha (Padrão B, já existe, zero tabela nova) |
| P2 | `Campaign.declared_angle` (seleção manual no Wizard + `PATCH`) está restrito aos mesmos 8 valores de `angles.ts` — desacoplado de `segment_angle_terms`. **Isso afeta a seleção humana também, não só o Jev** | `CampaignWizard.tsx`, `campaigns/route.ts`, `campaigns/[id]/route.ts` | Trocar `ANGLE_OPTIONS` fixo pela lista real de `segment_angle_terms` do segmento ativo — correção estrutural, maior que o escopo do Jev, mas bloqueante para honestidade do princípio zero-hardcode na origem do próprio campo que o Choice vai popular |
| P3 | `creativeAnalysisService.ts`: `angle` extraído pelo Vision é uma **3ª fonte** desalinhada (nem `angles.ts`, nem `segment_angle_terms`); `hook_type` tem enum hardcoded em TS (`VALID_HOOK_TYPES`); `cta_style`/`emotional_tone` **não têm enum em lugar nenhum** (nem código, nem tabela) — e o prompt `creative_vision_analysis` (global, `segment_id = NULL`) lista os 4 enums como texto fixo, igual para todo segmento | `creativeAnalysisService.ts:56-58,254-259,272-273` · `migration-2026-06-03-creative-prompts.sql:17-28` | Criar 2 tabelas novas (Padrão B): `segment_hook_type_terms` (segment_id, hook_slug, hook_label) e `segment_cta_style_terms` (segment_id, style_slug, style_label); unificar `angle` com `segment_angle_terms`; decidir com o usuário se `emotional_tone` também vira catálogo fechado ou fica deliberadamente livre (decisão de produto, §8) |
| P4 | `CrmAgentParamHint.default` é tipado só como `string` (`src/lib/crm/agents/types.ts`) — não existe variante para lista de opções (Choice) ou escala ordenada (Score). O schema do **banco** (`params JSONB`) já suportaria estrutura sem migração; a lacuna é só na interface TypeScript e na UI (`SegmentAgentesModal.tsx`), que hoje só renderiza pares chave=valor em texto livre | `types.ts` (interface `CrmAgentParamHint`) · `SegmentAgentesModal.tsx:183-209` | Estender `CrmAgentParamHint` com `options?: string[]` (Choice) e `levels?: {value: number; label: string}[]` (Score); estender o modal pra renderizar esses casos como lista editável (adicionar/remover/renomear) em vez de 2 inputs texto |
| P5 | Não foi localizada, nesta investigação, a página tenant `/crm/config/agentes` mencionada em entradas anteriores do histórico do projeto — **não confirmar a existência dela sem verificação direta** antes de assumir que o override por tenant dos agentes já tem UI pronta | — | Confirmar com uma verificação dedicada antes da Fase 6/7; se não existir, é trabalho adicional de UI tenant, não só Master |

### 5.3 Onde cada um dos 8 pontos de adoção (§3) será parametrizado — UI exata

| Prior. (§3) | Pilar | O que precisa ser parametrizável | Padrão (§5.1) | UI Master | UI Tenant | Tabela/coluna nova? |
|---|---|---|---|---|---|---|
| 1 — `angleClassifier` | Choice | Lista de ângulos do segmento | B (já existe) | `SegmentAnglesModal.tsx` — **já existe**, `/admin/master/segments` | Herda do segmento; sem override de tenant hoje (mesma regra já vale para o Radar/Wizard) | **Nenhuma** — só corrigir o código para ler a tabela existente (P1) |
| 2 — Vision `hook_type`/`angle`/`cta_style` | Choice | 3 catálogos de opções por segmento | B (novo para hook/cta; `angle` reaproveita o de #1) | **Novo**: generalizar `SegmentAnglesModal` numa tela com abas "Taxonomia de Criativos" (Ângulo \| Hook \| CTA), mesmo componente visual, trocando a fonte por aba | Sem override por tenant nesta 1ª fase (mesma decisão do Radar) | **2 tabelas novas**: `segment_hook_type_terms`, `segment_cta_style_terms` |
| 3 — Vision booleanos (Noul) | Noul | Quais das 5 checagens booleanas (ou outras, por segmento) aplicam | B (nova) | Nova aba "Checagens" dentro da mesma tela de Taxonomia de Criativos | — | **1 tabela nova**: `segment_creative_boolean_checks` (segment_id, check_key, check_label, ativo) |
| 4 — `reactivation` gate | Score | Escala de níveis + threshold + statement da pergunta ao Jev | C (params JSONB, após P4) + D (statement) | `SegmentAgentesModal.tsx` — **estender** (não criar nova tela) + novo `templateKey` em `/admin/master/prompts` | `/crm/config/agentes` (tenant) — **confirmar existência, P5** | Nenhuma tabela nova — `params` já é JSONB; precisa só da extensão de tipo/UI (P4) |
| 5/6 — Guardrail bot (Noul/Score) | Noul + Score | Threshold padrão por segmento + statement da pergunta + override por tenant | A (novo) + D (statement) | Novo campo no editor de segmento (mesmo padrão de `chatbot_max_turns_default`) + novo `templateKey` em `/admin/master/prompts` | `/mensageria/config` → aba Bot — **estender** com os novos campos (`jevGuardrailEnabled`, `jevThreshold`) dentro de `bot_flows.handoff_rules` (aditivo, confirmado sem migração) | 1 coluna nova em `system_segments` (ex. `jev_guardrail_threshold_default`) |
| 7 — `next_best_action` confiança | Score | Escala + statement | Mesma extensão de #4 | Mesma tela de #4 | Mesma tela de #4 | Nenhuma nova (reaproveita P4) |
| 8 — Roteamento Mensageria | Choice | Lista de entidades ativas do segmento | B (já existe) | `SegmentDataEntitiesModal.tsx` — **já existe** | — | **Nenhuma** — já é dirigido por dado |

**Resumo honesto:** dos 8 pontos, **2 já são zero-hardcode hoje e não exigem UI nova** (#1 depois
de corrigir o código, e #8 já está pronto). **3 exigem telas novas** (#2 e #3, unificadas numa só
tela com abas; #5/#6, estendendo uma tela já existente). **2 exigem estender um mecanismo já
existente** (#4 e #7, a mesma extensão de `CrmAgentParamHint`/`SegmentAgentesModal`). Nenhum
ponto exige inventar um mecanismo de cascata novo — todos reaproveitam Padrões A-D já em
produção.

### 5.4 Painel central de observabilidade (não de ativação)

Cada ponto de adoção é ativado/configurado na própria tela do domínio a que pertence (§5.3) —
**não** num painel "Jev on/off" central, para não duplicar a lógica de cascata segmento/tenant
já existente em cada domínio. Mas é recomendável 1 tela central (Master, nova aba em
`/admin/master/ia-plataforma`) que **agrega** status + métricas dos 8 pontos — ver Fase 9 (§6).

---

## §6 — Passo a passo faseado

### Fase 0 — Validação de acesso e contrato real de API

Confirmar diretamente com a TypeSafe AI (não via blog terceiro): self-serve vs. waitlist; payload
exato de cada pilar; billing real; **se aceita input multimodal** (crítico para a Fase 3).

**Esforço:** 0,5–1 dia (+ espera incerta).

### Fase 1 — Client Jev isolado + configuração

`jevClient.ts` com `jevChoice()`, `jevScore()`, `jevNoul()`. `JEV_API_KEY` no `.env.example`.

**Esforço:** 2–3 dias.

### Fase 2 — Adotar Choice em `angleClassifierService.ts`

> **P1 já corrigido (2026-10-14, ver §5.2)** — `classifyBatch()` já agrupa por segmento real e
> monta as opções a partir de `segment_angle_terms`. O que resta aqui é só trocar o LLM
> generativo pelo Jev nesse ponto específico, não mais nenhuma correção de hardcode.

1. Trocar a chamada `invokeForContext` por `jevChoice(opções_do_segmento, { campaignName })`.
3. Manter fallback (`angle:'other', confidence:'low'`) como rede de segurança.
4. Comparar lado a lado com o classificador atual por 1–2 semanas via `ClassifyModal` já
   existente antes de promover para produção.

**Esforço:** 4–6 dias (inclui a correção P1, que é trabalho real, não cosmético).

### Fase 3 — Adotar Choice/Noul em `creativeAnalysisService.ts`

> **P2 e P3 já corrigidos (2026-10-14, ver §5.2)** — `segment_hook_type_terms`/
> `segment_cta_style_terms`/`segment_creative_boolean_checks` já existem e já alimentam o
> prompt Vision; `angle` já está unificado com `segment_angle_terms`. **Ainda pendente:** a
> tela Master "Taxonomia de Criativos" (hoje a edição só é possível via SQL direto — as 3
> tabelas existem e são lidas em produção, mas não têm UI de curadoria ainda) e a decisão de
> produto sobre `emotional_tone` (§8 item 4, deliberadamente não tocado nesta correção).

1. Construir a UI Master de curadoria (abas Ângulo/Hook/CTA/Checagens), reaproveitando o padrão
   visual de `SegmentAnglesModal.tsx` — hoje só editável via SQL.
2. Decidir com o usuário o escopo de `emotional_tone` (§8).
3. Trocar extração categórica/booleana do Vision por chamadas Jev — **condicionado à
   confirmação de input multimodal na Fase 0**; se o Jev não aceitar imagem, usar
   `scene_description`/`key_visual_elements` (já extraídos pela Vision em texto) como proxy
   textual de entrada para o Jev, em vez da imagem.
4. Remover o clamp defensivo (`matchTaxonomyOption`/`matchAngle`) só depois de validar
   empiricamente que o Choice do Jev nunca produz valor fora do catálogo — nunca remover por
   confiança teórica.

**Esforço:** 4–6 dias (P2/P3 já resolvidos; resta a UI Master de curadoria + a troca real pelo
Jev, condicionada à Fase 0).

### Fase 4 — Mensageria: guardrail Noul pós-geração

1. Nova coluna `system_segments.jev_guardrail_threshold_default` (Padrão A) + novo `templateKey`
   (Padrão D) para o statement do Noul.
2. Estender `bot_flows.handoff_rules` com `jevGuardrailEnabled`/`jevThreshold` (aditivo).
3. Estender `/mensageria/config` aba Bot com esses campos.
4. Começar em modo log-only; medir 1–2 semanas antes de promover para bloqueante.

**Esforço:** 5–7 dias (inclui a UI tenant nova).

### Fase 5 — Mensageria: pilar Score (gate gradual)

Evoluir o Noul da Fase 4 para N níveis; painel de calibração de threshold.

**Esforço:** 4–6 dias.

### Fase 6 — Score no gate de `reactivationAgent.ts`

> **P4 e P5 já corrigidos (2026-10-14, ver §5.2)** — `CrmAgentParamHint` já suporta `type:
> 'choice'/'score'` com `options`/`levels`; `SegmentAgentesModal.tsx` (Master) e `/crm/config/
> agentes` (tenant, confirmado existente) já renderizam `<select>` estruturado. O parâmetro
> `requer_revisao_extra` já foi migrado de texto livre para Choice de 2 opções, como prova real
> do mecanismo. Falta só adicionar o nível `'score'` de verdade (hoje só Choice foi exercitado
> em produção) e trocar o LLM generativo pelo Jev neste ponto específico.

1. Adicionar `type:'score'` com `levels` reais ao(s) parâmetro(s) de confiança do
   `reactivationAgent.ts` (ex.: threshold de confiança pra pular a revisão).
2. Novo `templateKey` para o statement do Score.
3. Novo flag `requer_revisao_extra_bloqueada` — segmento sensível trava a decisão, Jev nunca
   pode afrouxar; decisão de negócio a confirmar por segmento com o usuário (§8).
4. Rollout em 1 tenant de teste antes de qualquer produção real.

**Esforço:** 3–5 dias (P4/P5 já resolvidos; resta o nível Score real + a troca pelo Jev).

### Fase 7 — Score de confiança em `nextBestActionAgent.ts`

Reaproveita a extensão de tipo/UI feita na Fase 6. Só leitura adicional ao atendente, sem efeito
colateral em produção.

**Esforço:** 2–3 dias.

### Fase 8 — Mensageria: pilar Choice (roteamento), menor prioridade

Já zero-hardcode na origem (§3, #8) — só wiring de código, sem parametrização nova.

**Esforço:** 3–4 dias.

### Fase 9 — Painel central de observabilidade

Nova aba em `/admin/master/ia-plataforma` agregando status/métricas dos 8 pontos, sem duplicar
a ativação (que fica em cada tela de domínio, §5.4).

**Esforço:** 5–7 dias.

### Fase 10 — Testes e rollout gradual

Extensão do `/api/admin/mensageria/bot/test` com `dryRun`/`jevPreview`; rollout por tenant,
começando pela Fase 2 (menor risco), nunca todas de uma vez.

**Esforço:** 4–5 dias + observação em produção (calendário, não dev).

---

## §7 — Estimativa total de esforço (dev-days, excluindo tempo de espera por acesso)

**Esforço já gasto e concluído (2026-10-14):** P1–P5 (§5.2) — correção dos 5 pré-requisitos de
hardcode legado, com testes rigorosos ponta a ponta contra dado real de produção. Não entra
mais na conta abaixo.

| Fase | Módulo | Pré-requisito de hardcode | Esforço restante |
|---|---|---|---|
| 0 — Validação de acesso | — | — | 0,5–1 dia (+ espera) |
| 1 — Client Jev isolado | — | — | 2–3 dias |
| 2 — Choice `angleClassifier` | Campanhas | ✅ P1 resolvido | 4–6 dias (só troca de LLM pelo Jev) |
| 3 — Choice/Noul Vision | Campanhas | ✅ P2/P3 resolvidos — falta a UI Master de curadoria | 4–6 dias |
| 4 — Guardrail Noul | Mensageria | — (tudo novo, sem pré-req) | 5–7 dias |
| 5 — Pilar Score | Mensageria | — | 4–6 dias |
| 6 — Score gate `reactivation` | CRM | ✅ P4/P5 resolvidos — falta o nível Score real | 3–5 dias |
| 7 — Score `next_best_action` | CRM | ✅ reaproveita P4 | 2–3 dias |
| 8 — Choice roteamento | Mensageria | Nenhum (já zero-hardcode) | 3–4 dias |
| 9 — Painel observabilidade | Todos | — | 5–7 dias |
| 10 — Testes/rollout | Todos | — | 4–5 dias + observação |
| **Total (dev puro, todas as fases restantes)** | | | **~32–47 dias úteis** |
| **Total (só Fases 0,1,2,7 — menor risco/menor pré-requisito)** | | | **~9–13 dias úteis** |

Com P1-P5 já resolvidos, o esforço restante caiu de ~43–60 para ~32–47 dias úteis — a parte
de código mais arriscada/ambígua (reconciliar 3+ fontes de taxonomia desalinhadas) já está
feita; o que resta em cada fase é majoritariamente a troca do LLM generativo pelo Jev em si
(bloqueada pela Fase 0) e UI de observabilidade/curadoria.

---

## §8 — Decisões a tomar com o usuário

1. Confirmar contato/acesso já existente com a TypeSafe AI, ou se a Fase 0 começa do zero.
2. Confirmar apetite de orçamento para 8 pontos de adoção, não 1 só.
3. Decidir ordem de prioridade real entre os 8 pontos — recomendação: Fases 0→1→2→7 primeiro
   (menor risco, menor pré-requisito).
4. **Escopo de `emotional_tone` (P3, Fase 3):** vira catálogo fechado por segmento (mais um
   ponto de Choice) ou permanece deliberadamente texto livre?
5. **Flag de trava por segmento (Fase 6):** quais segmentos devem ter
   `requer_revisao_extra_bloqueada = true` de forma que o Jev nunca possa afrouxar o gate de
   aprovação humana, independente de quão alta for a confiança reportada?
6. **P2 (Fase 3):** desacoplar `Campaign.declared_angle` de `angles.ts` afeta também a seleção
   MANUAL no Wizard, não só o Jev — confirmar que o usuário aceita essa mudança mais ampla como
   parte do escopo, já que é estruturalmente necessária para honestidade do zero-hardcode.
7. Confirmar input multimodal do Jev (Fase 0) antes de aprovar o desenho da Fase 3 como está.

---

## §9 — Riscos identificados

1. **Confiabilidade das fontes (§0)** — todo o plano pode precisar de ajuste material após
   confirmação do contrato real.
2. **Input multimodal não confirmado** — decide a viabilidade da Fase 3 como desenhada.
3. **Falso-positivo em guardrail Noul/Score** — sempre começar em modo log-only.
4. **Mudança de comportamento no gate do CRM (Fase 6)** — risco de negócio, não só técnico;
   nunca afrouxar segmento marcado como sensível (flag de trava, §8 item 5).
5. **Custo incremental por chamada adicional**, agora multiplicado por 8 pontos de adoção.
6. **P2 tem raio de impacto maior que o Jev** — muda o comportamento da seleção manual de
   ângulo no Wizard, usada hoje por operadores humanos; testar regressão com cuidado.
7. **Nenhum mecanismo de retry/circuit-breaker para um provider novo** — aplicar o mesmo
   princípio "nunca travar o fluxo principal por timeout" já usado para o LLM principal.
8. **P5 não confirmado** — se `/crm/config/agentes` (tenant) não existir, a Fase 6 ganha esforço
   de UI tenant não contabilizado na estimativa atual.

---

## §10 — Fora de escopo nesta rodada

- Substituição completa do LLM generativo principal pelo Jev em qualquer ponto.
- Geração de N candidatas + seleção pelo Jev (exigiria estender `LlmClient` e o loop de
  tool-use — mais invasivo, não recomendado nesta rodada).
- `segmentAngleSuggestionService.ts`/`segmentInterestSuggestionService.ts` — geração de listas
  de sugestão, não decisão categórica única; poderiam usar Score como refinamento de 2ª ordem,
  não incluído nas fases acima.
