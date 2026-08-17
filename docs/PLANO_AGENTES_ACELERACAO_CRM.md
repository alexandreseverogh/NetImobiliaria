# Plano — Agentes de IA para Aceleração de Lead → Venda (CRM, multi-segmento)

> Converte `docs/ANALISE_ACELERACAO_LEAD_VENDA_IA.md` num plano de ação executável. Este
> documento é o plano de referência da frente — atualizado a cada fase implementada, mesmo
> padrão de `docs/PLANO_MENSAGERIA.md`/`docs/PLANO_TIKTOK.md`.
>
> **F0 — Fundação: concluída e testada (2026-08-06).** **F0.5 — Score de Fit (ICP): concluída
> e testada (2026-08-06).** **F1 — Velocidade de 1º Contato: concluída e testada
> (2026-08-06).** **F2 — Estagnação por Etapa: concluída e testada (2026-08-06).**
> **F3 — Next Best Action: concluída e testada (2026-08-06).** Ver "Progresso" no fim do §6.

---

## 1. O problema que este plano resolve

A análise anterior propôs 5 alavancas (velocidade de 1º contato, estagnação, next-best-action,
recalibração de score, reativação). O usuário apontou o risco real: se essas alavancas forem
implementadas com uma **forma fixa** (mesmos estágios, mesmos prazos, mesma lógica de
"urgência"), elas funcionam bem pra um segmento e mal pra outro — porque cada vertical de
negócio tem um **ciclo de captação→venda estruturalmente diferente**:

| Dimensão do ciclo | Imobiliário | Saúde | Pet | Venda de Carros |
|---|---|---|---|---|
| Duração típica | Semanas a meses | Dias | Horas a 1-2 dias | 1-3 semanas |
| O que sinaliza urgência | "mudança", "hoje", "urgente" | Termo de gravidade médica | Quase nunca há urgência real | "test-drive esta semana" |
| Etapas do funil | Captado→Análise→Visita→Proposta→Fechamento | Lead→Triagem→Agendamento→Consulta | Lead→Contato→Agendamento | Lead→Test-drive→Proposta→Fechamento |
| Risco de reativação agressiva | Baixo | **Alto** (compliance/sensibilidade) | Baixo | Médio |

Duas dimensões precisam ser flexíveis, não só uma:
1. **O conteúdo** (vocabulário, prompts, urgência) — já resolvido pela arquitetura de
   `/crm/config/ia` (Master cura por segmento, tenant pode complementar).
2. **A forma do ciclo em si** (quais etapas existem, quanto tempo é normal, quais agentes
   fazem sentido ligar) — é isso que este plano precisa resolver, e é o ponto que a análise
   anterior deixou em aberto.

## 2. Princípio arquitetural central (resposta direta à dúvida do usuário)

**Nenhuma lógica de agente conhece o nome de nenhum segmento.** Todo agente é um módulo de
código plugável — mesmo padrão já comprovado em produção nesta base para o motor de
distribuição de leads (`src/lib/routing/strategies/` — 4 estratégias plugáveis, catálogo em
código, mas **quais rodam, em que ordem e com que parâmetros é 100% dado**, configurado pela
Master por segmento em `segment_distribution_strategies`). Vamos replicar exatamente esse
modelo pros agentes de aceleração — não é uma decisão nova, é aplicar um padrão já
validado nesta mesma base a um problema novo.

O que resolve a "forma do ciclo" (a parte que a análise anterior não cobria) são **3
mecanismos já existentes na plataforma, nunca conectados a uma ação ativa**:

1. **`kanban_colunas` já é 100% customizável por tenant** (`nome`, `titulo_exibicao`,
   `ordem`, `sla_hours`, `ativa`) — cada tenant já desenha o próprio funil, com quantas
   etapas quiser, no nome que quiser. Nenhum agente vai precisar de um "mapa de etapas
   universal" — vai ler o funil que o próprio tenant já montou.
2. **`kanban_colunas.sla_hours` já existe, já é por-etapa, já é por-tenant — e hoje não
   aciona nada** (confirmado: só aparece em relatórios passivos). É o hook exato que falta
   pro Agente de Estagnação — zero coluna nova, só passar a **ler** o que já existe com
   intenção ativa.
3. **A IA já reasoning em linguagem natural sobre o contexto do segmento** (é como
   `/crm/config/ia` já funciona hoje) — o Agente de Próxima Ação (NBA) não precisa de um
   enum rígido de "papel da etapa" pra funcionar em qualquer segmento: recebe o nome real da
   etapa (`titulo_exibicao`) como variável de prompt e raciocina em texto, com o Prompt
   Mestre do segmento já dando o tom. Isso evita reinventar uma segunda camada de "segmento"
   por cima da que já existe — mesma lição da rodada anterior (não duplicar `system_segments`).

Resultado: a "forma do ciclo" não precisa de uma tabela de configuração de etapas por
segmento — ela **já está resolvida** pelo Kanban customizável existente. O que este plano
adiciona é só a camada de agentes que lê esse funil já existente e age sobre ele.

## 3. Catálogo de Agentes (o "vocabulário" — código, não dado)

Cada agente é um módulo TypeScript implementando a mesma interface, registrado num catálogo
central — mirror exato de `DISTRIBUTION_STRATEGIES`/`DISTRIBUTION_STRATEGY_CATALOG`
(`src/lib/routing/strategies/index.ts`).

```ts
// src/lib/crm/agents/types.ts
export interface CrmAgentContext {
  tenantId: string
  leadUuid: string
  segment: Segment            // já resolvido via resolveSegment()
  params: Record<string, any> // config efetiva (tenant override > default do segmento)
}

export interface CrmAgentResult {
  shouldFire: boolean
  type: 'DEFENSIVE' | 'OFFENSIVE'   // mesma taxonomia já usada em AgentAction (Campanhas)
  title: string
  description: string
  confidence: number                // 0-1
  suggestedMessage?: string         // só quando OFFENSIVE (ex.: reativação)
}

export interface CrmAgent {
  key: string
  label: string
  description: string
  /** Quando o agente roda: em evento (lead criado, etapa mudou) ou em varredura (cron) */
  trigger: 'ON_LEAD_CREATED' | 'ON_STAGE_CHANGE' | 'SCHEDULED_SCAN'
  evaluate(ctx: CrmAgentContext): Promise<CrmAgentResult | null>
}
```

| Agente (`agent_key`) | Trigger | Tipo | O que faz | Depende de LLM? |
|---|---|---|---|---|
| `speed_to_lead` | `SCHEDULED_SCAN` (corrigido de `ON_LEAD_CREATED` — ver §6) | DEFENSIVE | Se não houver 1ª atividade (`atividades_lead`) em N minutos (config), alerta o responsável. Maior ROI, menor esforço — nenhuma IA generativa necessária, só timer. | Não |
| `stage_stagnation` | `SCHEDULED_SCAN` (cron) | DEFENSIVE | Lê `leads_kanban_ciclos.data_entrada` + `kanban_colunas.sla_hours` (já existe) + última `atividades_lead` — se estourou o SLA da etapa sem toque recente, alerta. | Não |
| `next_best_action` | `ON_STAGE_CHANGE` (+ sob demanda no Kanban) | Informativo (não é DEFENSIVE nem OFFENSIVE — só sugestão visível, nunca envia nada sozinho) | LLM sugere a próxima ação concreta, usando o Prompt Mestre do segmento + nome real da etapa + histórico do lead como contexto. | Sim — `getLlmClient(tenantId)` |
| `reactivation` | `SCHEDULED_SCAN` | OFFENSIVE (precisa aprovação — vai *falar* com o lead) | Lead sem toque há N dias (config) → LLM rascunha mensagem de reengajamento; humano aprova antes de enviar (mesmo fluxo PIN+WhatsApp já usado em Campanhas). | Sim |
| `score_recalibration` | `SCHEDULED_SCAN` (diário) | Duas ações automáticas + 1 sugestão aprovável (ver §3.2) | Quando um lead chega a estado terminal (`Fechamento`/`Perdido`), grava o desfecho contra a regra que originou a tag/score. | Não |

Adicionar um agente novo no futuro = 1 arquivo novo implementando `CrmAgent` + registrar no
catálogo — nenhum segmento existente muda de comportamento até a Master decidir ativá-lo.

## 3.1 Score de Fit (ICP) — separando intenção de encaixe

A pesquisa original é explícita: misturar "quão engajado esse lead parece" (intenção) com
"quão bem esse lead se encaixa no perfil ideal do negócio" (fit) num único número esconde
informação — dois leads com o mesmo score final podem pedir abordagens opostas (um "quer
muito mas não é o público certo", outro "é o público perfeito mas ainda está frio"). Hoje
`score_prontidao` (gerado por `ConciergeService.qualifyLead`) só mede intenção — não existe
dimensão de fit em lugar nenhum da plataforma.

Desenho, seguindo o mesmo padrão já usado pra qualificação (Master cura critérios por
segmento em texto livre, tenant complementa, o LLM raciocina sobre o critério em vez de
código validando campo por campo — evita reintroduzir hardcode específico de segmento):

- **`public.crm_fit_criterios_segmento`** (`segment_id UUID NOT NULL REFERENCES
  system_segments(id)`, `criterio text`, `peso integer`, `ordem`, `ativo`) — a Master
  descreve em texto livre o que "encaixe" significa pro segmento. Ex. imobiliário:
  "orçamento declarado compatível com o portfólio ativo do tenant"; saúde: "está dentro da
  área de cobertura do convênio aceito". Espelha `crm_qualificacao_regras_segmento`
  byte-a-byte, mesma tabela-irmã.
- **`public.crm_fit_criterios_tenant`** — override/adição do tenant, mesmo modelo, `tenant_id`
  sempre real.
- **`leads_staging.score_fit INTEGER`** (coluna nova, aditiva — `score_prontidao` não muda de
  nome nem de sentido, continua sendo só intenção; zero risco de regressão nos consumidores
  já existentes desse campo).
- **`ConciergeService.qualifyLead()`** ganha os critérios de fit como variável
  `{{criterios_fit}}` no mesmo Prompt Mestre já usado pra intenção — **1 única chamada de
  LLM** retorna os dois scores no mesmo JSON (`score_prontidao` + `score_fit`), sem dobrar
  custo/latência nem duplicar a chamada.

Kanban e ficha do lead passam a exibir os dois números lado a lado, nunca combinados num
terceiro "score geral" — a decisão de priorização fica com quem atende, informada pelos dois
eixos (ex.: "alta intenção, baixo fit" pede uma conversa de alinhamento de expectativa antes
de avançar; "baixa intenção, alto fit" pede nutrição, não pressa).

## 3.2 Recalibração — o que fica automático e o que exige aprovação

A plataforma inteira segue um princípio: nada que muda o que é dito a um cliente ou o texto
salvo de uma regra acontece sem uma pessoa confirmar — mas nada que é só *reordenação
interna, sem mudar conteúdo* precisa de aprovação. `score_recalibration` segue essa mesma
fronteira, em vez de ser só um relatório passivo que a Master tem que interpretar sozinha:

1. **Automático, sem aprovação** — reordena `ordem` das regras de
   `crm_qualificacao_regras_segmento`/`_tenant` pela taxa de conversão real observada (regra
   que mais vira negócio fechado passa a ser avaliada primeiro no fallback por
   palavra-chave). Não muda nenhum texto/score visível, só prioridade de match — mesmo
   espírito de baixo risco de um `ORDER BY` recalculado.
2. **Sugestão, precisa aprovação da Master** — quando o `score_base` atual de uma regra
   diverge muito da taxa de conversão real observada (ex.: regra com `score_base=9` mas só
   12% dos leads taggeados com ela realmente fecham negócio), gera um item na fila de
   aprovação (`crm_agent_actions`, `agent_key='score_recalibration'`, `type='OFFENSIVE'`
   reaproveitado aqui não pra falar com o cliente, mas pra mudar config visível) com o texto
   "Regra 'X': score atual 9, sugerido 4, baseado em N leads reais dos últimos M dias" — 1
   clique aplica, sem precisar a Master recalcular nada manualmente.
3. **Colunas de leitura** — `leads_gerados`, `leads_convertidos`, `taxa_conversao_observada`
   adicionadas a `crm_qualificacao_regras_segmento`/`_tenant` (ver §4), atualizadas pelo job
   diário — dado bruto sempre visível na tela de gestão, mesmo antes de qualquer sugestão
   disparar.

Isso fecha o gap sem introduzir um pipeline de retreinamento de ML (que não existe, e não
faz sentido, nesta arquitetura baseada em LLM+regras curadas) — "aprende com o resultado
real" aqui significa "surfaça o desvio pra quem decide, com 1 clique pra corrigir", coerente
com o resto da plataforma.

## 4. Modelo de dados

Réplica deliberada dos 2 padrões já usados e testados nesta sessão (regras de qualificação:
segmento sem `tenant_id` / tenant sempre com `tenant_id` real) — nunca uma 3ª convenção nova.

```sql
-- Config efetiva por segmento (Master-curated, sem tenant_id — mesmo modelo de
-- crm_qualificacao_regras_segmento / system_benchmarks).
CREATE TABLE public.crm_agentes_config_segmento (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id  uuid NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  agent_key   varchar(50) NOT NULL,
  ativo       boolean NOT NULL DEFAULT false,
  params      jsonb NOT NULL DEFAULT '{}',  -- ex.: {"minutos_alerta": 15} p/ speed_to_lead
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (segment_id, agent_key)
);

-- Override do tenant (tenant_id sempre real e concreto — nunca sentinela).
CREATE TABLE public.crm_agentes_config_tenant (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_key   varchar(50) NOT NULL,
  ativo       boolean,               -- NULL = herda do segmento
  params      jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_key)
);

-- Audit + fila de aprovação — mirror direto de campanhasmarketingdigital."AgentAction",
-- mesma taxonomia DEFENSIVE/OFFENSIVE, mesmo padrão de PIN+WhatsApp já testado em produção.
CREATE TABLE public.crm_agent_actions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_uuid         uuid NOT NULL REFERENCES public.leads_staging(lead_uuid) ON DELETE CASCADE,
  agent_key         varchar(50) NOT NULL,
  type              varchar(10) NOT NULL,   -- DEFENSIVE | OFFENSIVE
  title             text NOT NULL,
  description       text NOT NULL,
  suggested_message text,
  confidence        double precision NOT NULL,
  status            varchar(20) NOT NULL DEFAULT 'NOTIFIED', -- NOTIFIED|PENDING_APPROVAL|EXECUTED|REJECTED
  approval_pin      varchar(6),
  approval_pin_exp  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  executed_at       timestamptz
);
CREATE INDEX idx_crm_agent_actions_tenant_status ON public.crm_agent_actions(tenant_id, status);

-- Score de Fit (ICP) — §3.1. Réplica byte-a-byte de crm_qualificacao_regras_segmento/
-- _tenant, mesma dupla camada (Master sem tenant_id / tenant sempre com tenant_id real).
CREATE TABLE public.crm_fit_criterios_segmento (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id               uuid NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  criterio                 text NOT NULL,
  peso                     integer NOT NULL DEFAULT 5,
  ordem                    integer NOT NULL DEFAULT 0,
  ativo                    boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_fit_criterios_tenant (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  criterio                 text NOT NULL,
  peso                     integer NOT NULL DEFAULT 5,
  ordem                    integer NOT NULL DEFAULT 0,
  ativo                    boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- Aditivo, zero regressão em quem já lê/escreve score_prontidao hoje.
ALTER TABLE public.leads_staging ADD COLUMN score_fit INTEGER;

-- Recalibração (§3.2) — dado de desempenho real, lido pelo job diário e pela UI da Master.
-- Mesmas 3 colunas nas duas tabelas de regra (segmento e tenant).
ALTER TABLE public.crm_qualificacao_regras_segmento
  ADD COLUMN leads_gerados INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN leads_convertidos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN taxa_conversao_observada NUMERIC(5,2);

ALTER TABLE public.crm_qualificacao_regras_tenant
  ADD COLUMN leads_gerados INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN leads_convertidos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN taxa_conversao_observada NUMERIC(5,2);
```

Reaproveitado **sem nenhuma mudança de schema**:
- `kanban_colunas.sla_hours` — limiar de estagnação por etapa, já tenant-customizável.
- `leads_kanban_ciclos.data_entrada` — tempo real na etapa atual.
- `atividades_lead` — último toque humano real (já usado nesta sessão pro CRUD de Atividades).
- `system_prompt_templates` — 2 `template_key` novos (`crm_agent_next_best_action`,
  `crm_agent_reactivation_message`), mesma cascata segmento→global já usada por
  `crm_lead_qualification`.
- `getLlmClient(tenantId)` — mesmo factory, mesma cascata tenant→padrão da plataforma.

## 5. UI/UX por perfil

### Master (`/admin/master/segments` → nova gaveta "Agentes de Aceleração")
Mesmo padrão visual já usado nesta sessão pro modal de Qualificação — lista dos 5 agentes do
catálogo, toggle ativo/inativo + campos de parâmetro por agente (ex.: `speed_to_lead` mostra
um input "minutos até alertar"; `reactivation` mostra "dias de inatividade"). Sem código
novo por segmento — a Master decide a combinação. Ganha também uma sub-aba **"Critérios de
Fit (ICP)"**, mesmo padrão de lista editável já usado em "Regras de Qualificação" — cada
critério com seu peso, e uma coluna de leitura mostrando `taxa_conversao_observada` de cada
regra de qualificação assim que a recalibração (§3.2) tiver dado suficiente, com botão
"Aplicar sugestão" quando houver divergência.

### Tenant (`/crm/config/agentes`, ao lado de `/crm/config/ia`)
Lista somente-leitura dos agentes ativos herdados do segmento + bloco de override (mesmo
padrão "Suas Regras Personalizadas" já construído) pra ajustar parâmetro sem esperar a
Master. Nova aba "Aprovações Pendentes" — fila de ações `OFFENSIVE` aguardando confirmação
(mirror de `/admin/master/aprovacoes` do módulo de Campanhas) — inclui tanto sugestões de
`reactivation` (falar com o lead) quanto de `score_recalibration` (mudar uma regra).

### Corretor/atendente (Kanban)
- Badge no card: relógio vermelho "sem 1º contato há Xmin" (`speed_to_lead`) e "parado há X
  dias" (`stage_stagnation`) — mesmo espaço visual já usado hoje pro "Match %"/tag.
- **2 scores lado a lado, nunca combinados**: "Intenção" (`score_prontidao`, existente) e
  "Fit" (`score_fit`, novo) — mesma posição visual do "Match %" atual, sem introduzir um 3º
  número sintético.
- Painel "Sugestão da IA" na ficha do lead — card informativo do `next_best_action`, nunca
  bloqueante, com botão "Registrar como Atividade" (fecha o loop com a feature já existente).
- Notificação WhatsApp com link+PIN quando o `reactivation` propõe uma mensagem — clique abre
  uma tela de confirmação (aprovar edita e envia / rejeitar descarta), mesmo fluxo já
  validado em produção pro Agente de Campanhas.

## 6. Fases de implementação

| Fase | Entrega | Depende de | Risco |
|---|---|---|---|
| **F0 — Fundação** | Migração das 3 tabelas + interface `CrmAgent` + catálogo/registry + endpoint `GET/PUT /api/admin/master/segments/[id]/agentes` + modal Master | Nada (self-contained) | Baixo |
| **F0.5 — Score de Fit (ICP)** | `crm_fit_criterios_segmento`/`_tenant` + `leads_staging.score_fit` + extensão de `ConciergeService.qualifyLead()` (1 chamada de LLM, 2 scores) + UI de critérios + 2º número no Kanban | Nenhuma dependência dos agentes (F0-F5) — extensão direta de `/crm/config/ia`, já em produção | Baixo — aditivo, mesmo padrão já testado |
| **F1 — Speed to Lead** | Agente sem LLM, dispara no `POST /api/crm/leads`, grava `crm_agent_actions`, notifica via WhatsApp (infra já existe) | F0 | Baixo — maior ROI da lista, menor esforço |
| **F2 — Estagnação por Etapa** | Cron lendo `sla_hours`+`leads_kanban_ciclos`+`atividades_lead` | F0 | Baixo — reaproveita dado já existente |
| **F3 — Next Best Action** | 1º agente com LLM; 2 `system_prompt_templates` novos (segmento Imobiliário real + global); card na ficha do lead | F0, F2 (usa o mesmo cron de varredura) | Médio — depende de calibrar o prompt |
| **F4 — Reativação** | 1º agente OFFENSIVE de verdade; fluxo de aprovação PIN+WhatsApp; fila de aprovações no CRM | F0, F3 (reaproveita o LLM já calibrado) | Médio-alto — é o único agente que fala direto com o cliente |
| **F5 — Recalibração de Score** | Job diário (§3.2): reordenação automática por conversão real + colunas `leads_gerados`/`leads_convertidos`/`taxa_conversao_observada` + fila de sugestão de novo score (1 clique, exige aprovação) | F0, F0.5 (recalibra tanto a regra de qualificação quanto, no futuro, os critérios de fit) | Baixo — leitura de dado histórico, mudança de config sempre revisável |

Cada fase segue a disciplina já estabelecida nesta sessão: migração + código + teste com
dado real + limpeza de resíduo + checkpoint documentado, uma aprovação do usuário por fase
antes de avançar pra próxima — nenhuma fase implica a seguinte automaticamente.

### Progresso

**F0 — Fundação: ✅ concluída (2026-08-06).**
- `prisma/migration-2026-08-06-crm-agentes-f0.sql` (aplicada) — `crm_agentes_config_segmento`
  (sem `tenant_id`, mesmo modelo de `crm_qualificacao_regras_segmento`),
  `crm_agentes_config_tenant` (`tenant_id` sempre real), `crm_agent_actions` (mirror de
  `AgentAction` de Campanhas, mesma taxonomia DEFENSIVE/OFFENSIVE + PIN de aprovação).
- `src/lib/crm/agents/types.ts` — `CrmAgentContext`/`CrmAgentResult`/`CrmAgent`, mesmo
  molde de `src/lib/routing/strategies/types.ts`.
- `src/lib/crm/agents/index.ts` — `CRM_AGENTS`/`CRM_AGENT_CATALOG`, **deliberadamente vazios
  nesta fase**: nenhum agente real existe ainda (F1-F5 cada um registra 1 entrada aqui), então
  a API/UI não expõe nenhum toggle "de mentira" pra capacidade que ainda não roda — mesma
  disciplina já usada no gate `crm_ia_ativa`.
- `GET/PUT /api/admin/master/segments/[id]/agentes` — PUT valida `agent_key` contra o
  catálogo real; testado ao vivo que rejeita (400) qualquer chave ainda não registrada
  ("speed_to_lead" testado de propósito, confirma que F1 não pode ser "ligado" antes de
  existir de verdade).
- `SegmentAgentesModal.tsx` + botão "Agentes de Aceleração" (ícone raio, laranja) em
  `/admin/master/segments` — testado ao vivo (sessão Master real): modal abre, mostra
  honestamente "Nenhum agente disponível ainda" (não uma lista vazia sem explicação), botão
  Salvar desabilitado enquanto o catálogo estiver vazio.
- `npx tsc --noEmit`: 0 erros em todos os arquivos novos/tocados.

**F0.5 — Score de Fit (ICP): ✅ concluída (2026-08-06).**
- `prisma/migration-2026-08-06-crm-fit-f05.sql` (aplicada) — `crm_fit_criterios_segmento`
  (sem `tenant_id`) + `crm_fit_criterios_tenant` (`tenant_id` sempre real), mesma dupla camada
  já validada em `crm_qualificacao_regras_*`; `leads_staging.score_fit INTEGER` (aditivo,
  nunca muda o sentido de `score_prontidao`); as 2 linhas de `crm_lead_qualification`
  (global + Imobiliário) atualizadas com a seção `{{criterios_fit}}` + o 4º campo
  `score_fit` no JSON de saída — mesma 1 chamada de LLM, 2 scores.
- `ConciergeService.qualifyLead()` — busca critérios de fit (tenant+segmento) em paralelo com
  as regras de qualificação, injeta no prompt, parseia `score_fit` (clamp 0-10) da resposta.
  Fallback por palavra-chave nunca inventa fit (sempre `null` — não há como um match de
  keyword julgar "encaixe no perfil").
- `GET/PUT /api/admin/master/segments/[id]/fit-criteria` + `SegmentFitCriteriaModal.tsx` +
  botão "Critérios de Fit (ICP)" em `/admin/master/segments` (mesmo padrão de
  Qualificação/Agentes).
- `/api/crm/config/ia` + `/crm/config/ia` — 2 novas seções: "Critérios de Fit do Segmento"
  (leitura) + "Seus Critérios de Fit" (CRUD do tenant).
- `/crm/kanban` — card ganha `· Xx Fit` **só quando `score_fit` existe** (nunca um chip vazio
  fabricado); a ficha do lead trocou o tile "IPVE" — **achado real durante esta fase**: era um
  número inteiramente fabricado (`score_prontidao + 15`, sem nenhum dado real por trás,
  resíduo de antes desta sessão) — pelo tile real "Fit".
- **Achado real de robustez, corrigido na mesma rodada**: com Gemini (`gemini-flash-latest`,
  provider real do tenant de teste), o JSON de resposta veio truncado no meio repetidas vezes
  após a pergunta ganhar a 2ª dimensão de julgamento (fit) — `maxTokens` da chamada subiu de
  500 para 700 (prompt objetivamente mais longo/complexo agora). Testado que, mesmo truncando,
  o sistema nunca fabrica `score_fit` (cai pro fallback por regra, `score_fit=null`) — a
  resiliência funcionou exatamente como desenhado. Confirmado com Groq (`llama-3.3-70b-
  versatile`) que a chamada completa, com JSON limpo, retorna `score_fit` corretamente.
- **Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, segmento
  Imobiliário): `POST /api/crm/leads` com mensagem real → `score_prontidao=90`/`score_fit=80`
  persistidos corretamente em `leads_staging` (mesma convenção `*10` de `score_prontidao`) ·
  `GET /api/crm/leads` expõe `score_fit` pro Kanban · Master criou/consultou 2 critérios reais
  via API e confirmou no modal (sessão real, navegador) · tenant criou e removeu um critério
  próprio via `/crm/config/ia` (API + navegador, seção "Seus Critérios de Fit" renderizando os
  critérios do segmento + o próprio) · Kanban real (navegador, sessão JWT real): card mostrou
  `"90% Match · 80% Fit"`, os demais leads reais (sem fit ainda) mostraram só `"50% Match"`
  sem chip fabricado · ficha do lead mostrou tiles reais "Intenção 90%"/"Fit 80%", tile "IPVE"
  confirmado ausente. Todo dado de teste removido (lead, os 2 critérios de segmento, o
  critério de tenant), `count(*)=0` confirmado nas 3 tabelas. `npx tsc --noEmit`: 0 erros.
- **Incidente registrado, resolvido**: ao testar contra Groq, sobrescrevi
  `Settings.llmApiKey` do tenant de teste sem capturar o valor original primeiro — recuperado
  com alta confiança (mesmo comprimento + mesmo valor do `GEMINI_API_KEY` global do `.env`,
  plausível já que é o tenant de desenvolvimento da própria plataforma) e **verificado
  funcionalmente** (chamada real à API do Gemini autenticou com sucesso) antes de seguir.
  Lição pra próxima vez que precisar trocar uma credencial real pra teste: sempre capturar o
  valor completo antes de sobrescrever, não só metadados (provider/model/tamanho).

**F1 — Velocidade de 1º Contato: ✅ concluída (2026-08-06), 1º agente real do catálogo.**
- `src/lib/crm/agents/speedToLeadAgent.ts` — implementa `CrmAgent` (`trigger:
  'SCHEDULED_SCAN'`, já corrigido do `ON_LEAD_CREATED` original). `evaluate(ctx)` recebe 1
  lead específico: consulta se existe `atividades_lead` real (não deletada), calcula minutos
  desde `created_at`, dispara `DEFENSIVE` (`confidence:1`, sem LLM) quando ultrapassa
  `params.minutos_alerta` (fallback de código = 30min só quando o agente está ativo mas sem
  valor configurado — nunca dispara pra tenant com o agente desligado).
- `src/lib/crm/agents/runner.ts` (`runCrmAgentScans`) — acha candidatos com 1 query global
  (leads das últimas 48h sem atividade e sem ação já registrada pra este agent_key — mesma
  disciplina de idempotência de `scanAndAlertBreaches()` da Mensageria), resolve a config
  efetiva por tenant (override do tenant > default do segmento, com cache em memória por
  rodada de scan pra não repetir `resolveSegment`+2 queries por lead do mesmo tenant), chama
  `evaluate()`, e quando dispara grava `crm_agent_actions` (`status:'NOTIFIED'`) +
  `notifyWhatsApp`/`notifySlack` (mesmas funções já usadas pelos agentes de Campanhas e pelo
  SLA da Mensageria — notifica o WhatsApp/Slack **do tenant** configurado, não um número
  pessoal de corretor — não existe esse canal em nenhum lugar da plataforma hoje, e reusar o
  canal já provado em produção é mais seguro que inventar um novo pra esta fase).
- `POST /api/cron/crm/agentes-scan` (novo, `x-cron-secret`) — mesmo padrão exato de
  `/api/cron/mensageria/sla-check`. Registrado em `scripts/feed-cron-scheduler.js`, a cada 5
  minutos (mesmo intervalo do SLA da Mensageria).
- Catálogo (§3) e Fases (§6) atualizados: `speed_to_lead` agora registrado de verdade em
  `CRM_AGENT_CATALOG`/`CRM_AGENTS` — o toggle no modal Master deixou de mostrar "Nenhum
  agente disponível ainda" (F0) e passou a expor o agente real, configurável.

**Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, segmento
Imobiliário, `minutos_alerta:1` só pra acelerar o teste): 4 leads reais — 1 sem atividade e
backdatado 5min (`STALE`) → disparou; 1 sem atividade que envelheceu ~2min durante o teste
(`FRESH`) → disparou; 1 recém-criado, poucos segundos (`VERYNEW`) → não disparou (ainda
dentro do prazo); 1 com atividade real registrada e backdatado 5min (`CONTACTED`) → nunca
nem virou candidato (excluído já na query SQL, não chega a chamar `evaluate()`). Re-rodado o
scan uma 2ª vez → `fired:0`, confirmado por `count(*)` que nenhuma linha duplicada foi criada
(idempotência). Confirmado que nenhum outro tenant/lead real da base foi afetado
(`crm_agent_actions` só tinha as 2 linhas esperadas, todas do tenant de teste). Todo dado de
teste removido (leads + kanban + atividade, cascata confirmada), toggle do Master revertido
pra `ativo:false` (decisão de ativar de verdade + escolher `minutos_alerta` real fica com o
usuário/Master, não decidido nesta sessão). `npx tsc --noEmit`: 0 erros.

**F2 — Estagnação por Etapa: ✅ concluída (2026-08-06), 2º agente real do catálogo.**
- `src/lib/crm/agents/stageStagnationAgent.ts` — `trigger: 'SCHEDULED_SCAN'`. Sem LLM, só
  reaproveita 3 coisas que já existiam e nunca tinham sido ligadas a nenhuma ação ativa:
  `kanban_colunas.sla_hours` (já por-etapa, já por-tenant, default 24h — feature
  "Personalização Kanban", nunca antes consumida por nada), `leads_kanban_ciclos.data_entrada`
  do ciclo aberto (`data_saida IS NULL` = etapa atual do lead), e `atividades_lead` desde que
  entrou na etapa (toque humano recente cancela o alerta mesmo com SLA técnico estourado).
  Coluna sem `sla_hours` configurado (`NULL`) nunca gera candidato — não inventa limiar que o
  tenant não definiu.
- **Idempotência escopada ao CICLO, não ao lead pra sempre** — diferente de F1 (onde "já teve
  atividade uma vez" encerra o alerta pro lead inteiro), aqui uma ação antiga de uma etapa
  ANTERIOR não bloqueia um alerta novo quando o lead já avançou e estagnou de novo numa etapa
  DIFERENTE (`caa.created_at >= lkc.data_entrada` no `NOT EXISTS`) — testado e confirmado.
- **Generalização do runner (`src/lib/crm/agents/runner.ts`)** — antes hardcoded só pro
  `speed_to_lead` (F1), agora itera qualquer agente `SCHEDULED_SCAN` com `findCandidates()`
  definido (novo método opcional em `CrmAgent`, `types.ts`) — cada agente sabe achar os
  próprios candidatos com sua própria condição (F1: sem atividade desde a criação; F2: sem
  atividade desde que entrou na etapa atual), o runner só orquestra (resolve config efetiva,
  chama `evaluate()`, grava `crm_agent_actions`, notifica). `resolveEffectiveConfig` ganhou
  `agentKey` como parâmetro (antes fixo em `speed_to_lead`), inclusive na chave do cache.
  `speedToLeadAgent.ts` também migrado pro novo formato (`findCandidates()` próprio, extraído
  do que antes vivia hardcoded dentro do runner).
- **Bug real encontrado e corrigido durante o teste ao vivo**: `leads_kanban_ciclos` tem
  colunas `tenant_id`/`client_id` no schema, mas o trigger que popula essa tabela
  (`trg_log_kanban_ciclos`) nunca as preenche — ficam sempre `NULL` (confirmado via SQL
  direto). A 1ª versão do `findCandidates()` lia `tenant_id`/`client_id` direto de
  `leads_kanban_ciclos` (copiando o padrão do F1, que lê de `leads_staging` — fonte
  diferente) — resultado: todo candidato vinha com `tenantId: null`, `resolveSegment` sempre
  retornava `null`, e o agente nunca disparava pra ninguém (`scanned:9, fired:0` no 1º teste).
  Corrigido com `JOIN leads_staging ls` pra pegar `ls.tenant_id`/`ls.client_id` (fonte
  confiável, mesma usada por F1).

**Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, coluna real
"Lead Captado" com `sla_hours=2`, ativado só via override de tenant pra não afetar outros
tenants): lead sem atividade, ciclo backdatado 3h (`STALE`) → disparou, `title` exato "Lead
parado em 'Lead Captado' há 3h" · lead com atividade real registrada 1h após a entrada na
etapa (`ATIVO`) → nunca virou candidato · lead com ciclo backdatado só 30min (`DENTRO SLA`,
teto de 2h) → não disparou · scan re-rodado → `fired:0`, confirmado sem duplicata (mesma
disciplina de idempotência de F1) · **teste específico de idempotência por ciclo**: o lead
`STALE` movido pra uma 2ª coluna real ("Em Análise", `sla_hours=4`), backdatado com
timestamps internamente coerentes (ação antiga movida pra 10 dias atrás, novo ciclo pra 9
dias atrás — necessário porque um backdate "solto" de poucas horas cria uma ordem cronológica
impossível dentro de uma sessão de teste de poucos minutos) → **disparou um 2º alerta
independente** pra etapa nova ("Lead parado em 'Em Análise' há 216h"), sem apagar nem duplicar
o alerta da etapa anterior — confirma que a estagnação é rastreada por ciclo, não pelo lead
inteiro · coluna real ("perdido", sem lead algum antes do teste) com `sla_hours` zerado pra
`NULL` temporariamente + lead ali dentro backdatado 100h → nunca virou candidato, confirmando
que etapa sem SLA configurado nunca dispara · `sla_hours` da coluna restaurado ao valor
original (24) logo em seguida. **Confirmado sem efeito em nenhum outro tenant**
(`crm_agent_actions` só tinha linhas do tenant de teste, `GROUP BY tenant_id` = 1 linha só).
**Cuidado real tomado durante o teste, não hipotético**: o tenant de teste tem
`slack_webhook_url`/`evolution_api_url` REAIS configurados (não fake) — como o scan também
processa leads genuinamente antigos e já estagnados que já existiam no banco antes desta
sessão (ex. o lead real "Roberto Severo", de sessões anteriores), rodar o scan sem cuidado
mandaria notificações reais pro Slack/WhatsApp do tenant sobre leads que não fazem parte deste
teste controlado — os 2 canais foram temporariamente nulados no banco antes de cada rodada de
scan e restaurados ao valor real exato logo depois, confirmado via SQL que o valor final bate
com o original. Todo dado de teste removido ao final (3 leads + cascata confirmada, as 7
linhas de `crm_agent_actions` geradas pelo teste — incluindo as dos 5 leads reais
pré-existentes que também estavam genuinamente estagnados — removidas por completo, override
de tenant removido, `count(*)=0` em todas as tabelas tocadas). `npx tsc --noEmit`: 0 erros.

**F3 — Next Best Action: ✅ concluída (2026-08-06), 1º agente com LLM do catálogo.**
- Diferente de F1/F2, `trigger: 'ON_STAGE_CHANGE'` (+ sob demanda) — nunca `SCHEDULED_SCAN`,
  então `nextBestActionAgent.ts` não implementa `findCandidates()`: não faz sentido varrer
  todos os leads pra sugerir a próxima ação de cada um a cada 5 minutos, é sempre "este lead
  específico, agora". Consequência arquitetural: a resolução de config efetiva
  (tenant override > default do segmento) foi extraída de `runner.ts` pra
  `src/lib/crm/agents/effectiveConfig.ts` (`resolveEffectiveAgentConfig`), compartilhada entre
  o loop de scan (que envolve com cache por-rodada) e o fluxo de 1-lead-por-vez de F3 (sem
  cache — não faz sentido pra uma única resolução).
- `type: 'INFORMATIVE'` — novo valor no union de `CrmAgentResult.type` (`types.ts`), ao lado
  de `DEFENSIVE`/`OFFENSIVE`. Nunca dispara `notifyWhatsApp`/`notifySlack`, nunca exige PIN —
  é só uma sugestão de texto persistida em `crm_agent_actions` (reaproveitada, não uma tabela
  nova) pra a ficha do lead ler. `crm_agent_actions.type` era `varchar(10)` (suficiente só pra
  `DEFENSIVE`/`OFFENSIVE`, 9 chars cada) — alargado pra `varchar(20)` na migração desta fase.
- `src/lib/crm/agents/nextBestActionAgent.ts` — monta o contexto real do lead (nome, etapa
  atual + tempo nela via `leads_kanban_ciclos.data_entrada` do ciclo aberto, qualificação já
  existente — `tag_sonho`/`resumo_ia`/`score_prontidao`/`score_fit`, as N atividades mais
  recentes) e chama `getLlmClient(tenantId)` com o Prompt Mestre do segmento
  (`crm_agent_next_best_action`, cascata segmento→global igual `crm_lead_qualification`,
  variante real pro Imobiliário nesta migração) — resposta é TEXTO LIVRE (1-3 frases, sem
  JSON), diferente de F0.5 (que precisa de JSON multi-campo). **N vem de
  `params.qtd_atividades_contexto`** (fallback de código = 5 só quando o agente está ativo sem
  valor configurado, clamp 1-20) — achado pelo usuário durante a revisão: a 1ª versão tinha
  `LIMIT 5` cravado direto na query, mesma classe de descuido que o princípio "zero hardcoded"
  do plano existe justamente pra pegar. Corrigido pra seguir o mesmo padrão já usado por
  `speed_to_lead.minutos_alerta` — configurável pela Master em `/admin/master/segments` →
  "Agentes de Aceleração" (o editor genérico de parâmetros já existente, sem UI nova) e
  sobreponível pelo tenant em `crm_agentes_config_tenant`.
- `src/lib/crm/agents/nextBestActionService.ts` — `getLatestNextBestAction` (leitura, sem
  custo de LLM, usada no `GET` que carrega a ficha do lead) e `refreshNextBestAction` (gera
  via LLM e persiste — usada tanto pelo trigger automático quanto pelo botão manual), ambas
  checando `ativo` antes de qualquer chamada — nunca gera nem finge sugestão pra tenant/
  segmento sem o agente ligado.
- `GET/POST /api/crm/leads/[leadUuid]/next-best-action` — mesmo padrão de auth (`getCurrentUser`
  cookie/Bearer) e isolamento por tenant (`leads_staging.tenant_id`) já usado no resto de
  `/api/crm/*`; Master bypassa o filtro de tenant, igual sempre.
- `POST /api/crm/kanban/move` ganhou o trigger `ON_STAGE_CHANGE`: depois de mover o lead com
  sucesso, chama `refreshNextBestAction(...).catch(...)` sem `await` — best-effort, nunca
  bloqueia nem falha a resposta do move (mesma disciplina de `notifyWhatsApp`/`notifySlack`
  já usada nos agentes de scan).
- UI: `NextBestActionCard.tsx` (novo) — card "Sugestão da IA" na ficha do lead (`/crm/kanban`),
  entre a Análise Concierge IA e o Histórico de Visitas; não renderiza NADA quando o agente
  está desativado pro tenant/segmento (mesma disciplina de nunca expor uma capacidade "de
  mentira" já usada desde F0); botão "Atualizar sugestão" (força nova chamada LLM) e
  "Registrar como Atividade" (fecha o loop com a feature já existente). `AtividadesLead.tsx`
  ganhou um prop opcional `prefill={{text, nonce}}` — reabre o form de Nova Atividade
  pré-preenchido com o texto da sugestão quando esse clique acontece; `nonce` garante reabrir
  mesmo clicando 2x na mesma sugestão.
- **Master** — zero código novo necessário: `next_best_action` entrou em `CRM_AGENT_CATALOG`
  (`index.ts`), e `GET/PUT /api/admin/master/segments/[id]/agentes` já lê o catálogo
  dinamicamente — o agente passou a aparecer automaticamente no modal genérico "Agentes de
  Aceleração" já construído em F0, sem precisar de nenhuma tela nova.

**Achado real durante o teste ao vivo — ajuste de `maxTokens`:** a 1ª chamada (300 tokens)
veio cortada no meio de uma frase real ("Envie agora via WhatsApp uma seleção de imó"); subir
pra 500 pareceu piorar (vazou conteúdo de rascunho/raciocínio interno do modelo, nunca a
resposta final: "-grounded in data):** \*Draft 1:*"). Só em 1500 tokens a resposta veio limpa,
curta e correta — mesma classe de comportamento já documentada em F0.5 (Gemini consumindo
parte do orçamento de tokens em conteúdo interno antes da resposta visível, então um teto
"generoso o bastante pro texto final" ainda corta se não cobrir também esse consumo invisível).
`maxTokens` fixado em 1500, com comentário no código explicando o porquê.

**Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, segmento
Imobiliário, `crm_agentes_config_tenant` ativado só pra este tenant): lead real criado via
`POST /api/crm/leads` com mensagem real ("quero comprar um apartamento de 3 quartos em Boa
Viagem, tenho a entrada guardada") → qualificação real disparou (`tag_sonho`, `score_
prontidao=90`) · atividade real registrada (contato via WhatsApp, orçamento até R$650 mil) ·
`GET next-best-action` antes de gerar → `{enabled:true, suggestion:null}` (honesto, nunca
inventa) · `POST next-best-action` → sugestão real e específica, citando os dados reais do
lead: *"Selecione e envie ao cliente via WhatsApp de 2 a 3 opções de imóveis localizados em
Boa Viagem, com 3 quartos e valor de até R$ 650 mil. Junto com o envio das opções, pergunte
qual delas mais chamou sua atenção para agendar uma visita presencial."* — nunca genérica
("entre em contato"), usando só dado real (nunca inventou imóvel/bairro/valor não fornecido)
· `GET` seguinte confirmou a sugestão persistida corretamente · confirmado que nenhum outro
tenant tem `next_best_action` ativo por padrão (`crm_agentes_config_segmento` sem nenhuma
linha pro agente, só o override deste 1 tenant em `crm_agentes_config_tenant`) — desligado por
padrão em todo o resto da plataforma, mesma disciplina de F1/F2.

**Lacuna de verificação registrada com honestidade, não escondida:** o trigger automático
`ON_STAGE_CHANGE` (chamado de dentro de `POST /api/crm/kanban/move`) usa a MESMA função
(`refreshNextBestAction`) já provada correta via o teste direto do endpoint acima — revisão de
código confirma a chamada (`refreshNextBestAction(leadTenantId, lead_uuid, leadClientId)
.catch(...)`, 3 linhas, sem lógica própria) é uma reexecução idêntica do caminho já testado. A
confirmação AO VIVO desse gatilho específico esbarrou na cota diária gratuita real do Gemini
(`RESOURCE_EXHAUSTED`, 20 requisições/dia, já consumida por todos os testes de LLM desta sessão
— F0.5 incluído) — 2 tentativas de mover o lead de coluna depois do teste bem-sucedido do
endpoint direto confirmaram a chamada sendo feita (nenhum erro na resposta do move, que nunca
bloqueia) mas sem crédito de API restante pra completar a chamada real ao LLM. Não é uma
lacuna de lógica não revisada — é uma chamada real à mesma função já provada, sem outro provider
real disponível pra essa sessão testar (nenhum tenant tem `anthropic_api_key` real configurado;
trocar de provider exigiria uma credencial nova, fora de escopo desta rodada). Todo dado de
teste removido (lead + atividade + cascata, override do tenant revertido pra 0 linhas),
`count(*)=0` confirmado em `leads_staging`/`crm_agent_actions`/`crm_agentes_config_tenant`
pro `agent_key='next_best_action'`. `npx tsc --noEmit`: 0 erros.

**Follow-up mesma sessão — 2 achados reais do usuário testando o modal da Master, ambos
corrigidos: parâmetro sem UI de descoberta + página de override do tenant nunca construída.**

1. **`paramHints` — parâmetros deixaram de ser "só de quem já sabe o nome de cabeça".**
   `CrmAgent` (`types.ts`) ganhou `paramHints?: { key, label, default }[]` — cada agente
   declara os próprios parâmetros reconhecidos (`speed_to_lead.minutos_alerta`,
   `next_best_action.qtd_atividades_contexto`; `stage_stagnation` sem nenhum, de propósito —
   o limiar dele vive em `kanban_colunas.sla_hours`, outra superfície). `CRM_AGENT_CATALOG`
   passou a ser DERIVADO de `CRM_AGENTS` (`index.ts`) em vez de repetir campo a campo — evita
   o catálogo divergir do agente real quando um campo novo é adicionado só num dos dois
   lugares (exatamente o tipo de erro que gerou o achado original: o `LIMIT 5` do 3º agente
   estava cravado direto no código, sem nenhuma UI que revelasse a existência do parâmetro).
   `SegmentAgentesModal.tsx` (Master) renderiza os hints não-usados como chips clicáveis
   ("+ Qtd. de atividades recentes no contexto (5)") que já preenchem a linha com o valor
   padrão — testado ao vivo, clique confirmado adicionando a linha corretamente. O valor
   "padrão" nunca existe em dois lugares (documentado + fallback do código) — extraída 1
   constante por agente (`QTD_ATIVIDADES_DEFAULT`, `MINUTOS_ALERTA_DEFAULT`) usada nos dois
   pontos.
2. **`/crm/config/agentes` — a página que o modal da Master sempre dizia existir, mas nunca
   existiu.** Achado pelo usuário lendo o próprio texto do modal ("cada tenant pode sobrepor
   em /crm/config/agentes") — o mecanismo de override (`crm_agentes_config_tenant`) já
   existia no banco desde F0 (usado por `resolveEffectiveAgentConfig`), mas só era gravável
   via SQL direto. Construída a página real, espelhando exatamente o padrão já provado de
   `/crm/config/ia`: `GET/PUT /api/crm/config/agentes` (mesmo `getCurrentUser`
   cookie/Bearer, `resolveSegment(tenantId, clientId)`; PUT só escreve em
   `crm_agentes_config_tenant`, nunca na tabela do segmento; `ativo: null` explícito = herda
   o padrão do segmento, `true`/`false` = força independente do segmento) +
   `src/app/crm/config/agentes/page.tsx` (mesmo visual do modal da Master, com 3 estados por
   agente — "Herdar do segmento" / "Forçar ativado" / "Forçar desativado" — mais o padrão do
   segmento sempre visível ao lado, somente leitura). Registrada na sidebar (categoria
   "Configurações CRM") pelo mesmo padrão idempotente já usado por "Catálogo de Atividades"
   (`system_features` + `permissions` + `role_permissions` espelhando quem já acessa
   "Personalização Kanban" + `tenant_feature_overrides` pros mesmos 3 tenants). Texto do
   modal da Master corrigido pra apontar pra página real em vez do aviso "ainda não tem tela
   própria".

**Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, segmento
Imobiliário): `GET` inicial → catálogo + padrão do segmento (`speed_to_lead` desativado) +
override do tenant vazio · `PUT` real forçando `next_best_action` ativo com
`qtd_atividades_contexto=7` → persistiu corretamente em `crm_agentes_config_tenant` (mesma
linha que `resolveEffectiveAgentConfig` já lê, confirmado por SQL direto — reaproveita o
mecanismo já provado em F3, só fecha o gap de UI) · `PUT` com `agent_key` inventado → 400 ·
2º tenant real (Imobiliaria XYZ, mesmo segmento) → `GET` mostra o MESMO padrão do segmento
mas `tenantOverrides` vazio — confirma isolamento real entre tenants do mesmo segmento ·
navegador real (sessão JWT do tenant, não Master): página renderiza com o estado real
carregado (input com `qtd_atividades_contexto`/`7` confirmado via JS, botão "Forçar ativado"
com a classe visual ativa) · clique em "Herdar do segmento" + "Salvar" pela própria UI (não
via curl) → confirmado por SQL que persistiu `ativo=NULL` mantendo o `params` intacto ·
`get_sidebar_menu_for_user()` real confirma o item "Agentes de Aceleração (CRM)" dentro de
"Configurações CRM", ao lado de "Personalização Kanban"/"Catálogo de Atividades". Todo dado
de teste removido (`crm_agentes_config_tenant` zerado), `npx tsc --noEmit`: 0 erros.

**F4 — Reativação: ✅ concluída e testada, mesma sessão. 1º agente `OFFENSIVE` de verdade do
catálogo.** `src/lib/crm/agents/reactivationAgent.ts` — `trigger: 'SCHEDULED_SCAN'`,
`findCandidates()` acha leads sem nenhuma `atividades_lead` há mais de um piso genérico de 6h
(o corte real é `dias_inatividade`, resolvido por `evaluate()`), excluindo etapas terminais
(`kanban_colunas.nome IN ('fechamento','perdido')`) e leads sem telefone (nunca proporia
reativação de algo impossível de enviar) — cooldown de 30 dias ou `PENDING_APPROVAL` em aberto
evita reproposta repetida do mesmo lead a cada scan. `evaluate()` chama o LLM
(`crm_agent_reactivation_message`, mesma cascata segmento→global de `crm_agent_next_best_action`)
pra rascunhar a mensagem — `maxTokens=1500`, mesmo achado real já documentado em F0.5/F3
(Gemini com teto baixo corta a resposta ou vaza raciocínio interno). `paramHints`:
`dias_inatividade` (default 7) e `requer_revisao_extra` (default `'false'`, string — mesmo
padrão dos demais parâmetros, editado como texto livre no editor genérico).

`requer_revisao_extra` (docs/PLANO_AGENTES_ACELERACAO_CRM.md §7 item 2, decisão fechada nesta
fase): quando `true` no config efetivo (tenant > segmento), aprovar a sugestão NUNCA dispara
envio automático — só grava o rascunho revisado com status novo `APPROVED_MANUAL` (distinto de
`EXECUTED`, pra nunca sugerir "foi enviado" quando não foi). Sem essa flag, aprovar de fato
envia via WhatsApp real, reaproveitando a infra já provada da Mensageria
(`resolveWhatsAppInbox` + `ingestMessage` com `senderType:'system'` + `sendEvolutionMessage`) —
mesmo trio que o bot usa pra responder de verdade, nunca um canal novo inventado só pra este
agente. Falha real de envio (credencial ausente/API fora do ar) marca `EXECUTED` com
`delivery_status='failed'` na mensagem, nunca trava a decisão do humano nem esconde o rascunho.

`src/lib/crm/agents/reactivationExecutor.ts` (novo, compartilhado pelos 2 fluxos de decisão
abaixo — a lógica de aprovar/rejeitar é idêntica, só muda COMO o humano se autentica):
- `src/app/api/crm/agent/approve|reject/[id]/route.ts` (novo) — mirror exato do fluxo HTML+PIN
  já em produção nos agentes de Campanhas (`src/app/api/agent/approve|reject/[id]/route.ts`):
  link de WhatsApp sem sessão, PIN de 6 dígitos, formulário de aprovação com a mensagem
  **editável** antes de confirmar (plano §5: "aprovar edita e envia").
- `src/app/api/crm/agent/approvals/route.ts` (novo) — equivalente autenticado (sem PIN, sessão
  JWT já é a prova de identidade), mesmo padrão de `/api/admin/master/aprovacoes` (Campanhas).
  Nunca confia em `tenant_id` do body — sempre resolve a ação real e compara contra o tenant da
  sessão antes de decidir (Master bypassa), testado ao vivo com JWT de um 2º tenant real →
  403 confirmado.
- `src/lib/crm/agents/runner.ts` — `recordAndNotify()` (extraído do corpo do loop) ramifica por
  `result.type`: OFFENSIVE gera PIN+expiração (mesmo `Math.floor(100000+Math.random()*900000)`
  de `agentDecisor.ts`), grava `status='PENDING_APPROVAL'` e notifica com
  `notifyApprovalRequired`-like (PIN + links de aprovar/rejeitar); DEFENSIVE mantém o
  comportamento de sempre (F1/F2, só notifica).
- `src/app/crm/config/agentes/page.tsx` — nova aba "Aprovações Pendentes" (badge com contagem
  real), lista com textarea editável + Aprovar/Rejeitar, mesmo padrão visual de
  `/admin/campanhas/aprovacoes`.
- `SegmentAgentesModal.tsx` — 4º bloco no painel de Ajuda já existente (explica quando roda, os
  2 parâmetros reconhecidos, e que este é o único agente que efetivamente FALA com o lead).

**Testado ao vivo, ponta a ponta, com dado e LLM reais** (tenant Marketing Digital, segmento
Imobiliário): achado real no processo — a cota diária gratuita do Gemini já estava esgotada
(mesmo limite de 20 req/dia documentado em sessões anteriores), contornado trocando
temporariamente o provider do tenant de teste pra Groq (mesma técnica já usada em F0.5),
revertido ao Gemini original ao final. 4 leads de teste reais (sem atividade, backdatados 10
dias, fora de etapa terminal): **Caminho A (send real)** — aprovado via PIN com mensagem
editada → `status=EXECUTED`, `suggested_message` = texto editado (não o rascunho original,
confirma que a edição prevalece), linha real criada em `mensageria.messages`
(`direction=outbound, sender_type=system, delivery_status=failed` — falha esperada e seguríssima:
as credenciais reais de Evolution/Slack deste tenant foram temporariamente neutralizadas
*antes* de qualquer scan, pelo mesmo motivo já documentado em F2, "o tenant de teste tem
`evolution_api_url`/`slack_webhook_url` REAIS" — restauradas ao valor exato depois, confirmado
por SQL). **Caminho B (rejeição via PIN)** — PIN errado → 422 com reformulário; PIN certo →
`REJECTED`. **Caminho C (`requer_revisao_extra=true`, via API autenticada)** — aprovado →
`status=APPROVED_MANUAL`, `executed_at` NULL, **zero linha criada em `mensageria.contacts`**
pro telefone do lead (confirma que nem a tentativa de envio chega a acontecer). **Caminho D
(ownership)** — JWT de um tenant diferente tentando decidir a ação → 403 real. **UI real,
clique a clique** (sessão JWT real do tenant + Master, não hipotético): aba "Aprovações
Pendentes" renderiza o item com o rascunho real da IA, clique em "Rejeitar" remove da lista e
persiste `REJECTED` no banco; painel de Ajuda do Master mostra a seção nova do 4º agente.
Todo dado de teste removido (5 leads + kanban + ações + trace de mensageria + override de
tenant), credenciais Evolution/Slack/LLM restauradas ao valor exato original (confirmado por
SQL, não por memória), `npx tsc --noEmit`: 0 erros.

**F5 — Recalibração de Score: ✅ concluída e testada, mesma sessão. Último agente do plano —
fecha `docs/PLANO_AGENTES_ACELERACAO_CRM.md` por completo.**

**Achado real que muda o §4 literal do plano, decidido nesta fase:** o PUT do Master
(`/api/admin/master/segments/[id]/qualification-rules`) e o fluxo equivalente do tenant fazem
**replace-all** (DELETE + reinsert) a cada save — nenhum `id` de
`crm_qualificacao_regras_segmento`/`_tenant` sobrevive entre edições, mesmo sem nenhuma
mudança de conteúdo. Guardar `leads_gerados`/`leads_convertidos`/`taxa_conversao_observada`
como COLUNAS da própria regra (como o §4 original propunha via `ALTER TABLE`) seria apagado
no próximo save do Master/tenant. Corrigido: as 3 estatísticas nunca são persistidas — são
**computadas ao vivo**, sempre por `(escopo, tag_resultante)` — a mesma identidade que já
importa de verdade pro motor (`ConciergeService.matchByKeyword` casa por tag, não por id de
regra) — em `src/lib/crm/agents/scoreRecalibrationService.ts`, lido tanto pelas telas (GET)
quanto pelo job diário.

**Único agente do catálogo que não opera por lead** — opera sobre REGRAS. Por isso a fila de
sugestão também não reaproveita `public.crm_agent_actions` (F0) — aquela tabela exige
`lead_uuid NOT NULL`, e recalibração não tem lead nenhum por trás. Nova tabela dedicada,
`public.crm_score_recalibration_suggestions` (`scope 'segmento'|'tenant'`, unique index por
`(scope, alvo, tag)` só entre `PENDING` — nunca duplica a mesma proposta em rodadas seguidas
enquanto não decidida). Aprovação é **1 clique in-app, sem PIN** — Master/tenant já está
autenticado na mesma tela onde vê a sugestão; PIN+WhatsApp (F4) existe especificamente pra
ações que falam com o CLIENTE, não pra ajustar um valor de config interna.

`src/lib/crm/agents/scoreRecalibrationAgent.ts` — registrado em `CRM_AGENTS` só pra
reaproveitar 100% a UI genérica de toggle/params já construída (`SegmentAgentesModal.tsx`,
`/crm/config/agentes`); `evaluate()` sempre retorna `null` de propósito (nunca dispara via o
`runner.ts` genérico, que é lead-scoped) — a lógica real roda via
`runScoreRecalibration()`, chamada por um cron **diário** dedicado
(`POST /api/cron/crm/score-recalibration`, 04h, deliberadamente separado do scan de 5 em 5
min dos outros 4 agentes). `paramHints`: `janela_dias` (90), `divergencia_minima_pct` (30),
`min_leads_amostra` (10).

**O que o job faz, por escopo ativo** (segmento via `crm_agentes_config_segmento`; tenant via
`resolveEffectiveAgentConfig`, mesma cascata dos outros 4 agentes): (1) computa conversão real
por tag (leads com aquela tag vs. quantos chegaram em `kanban_colunas.nome='fechamento'`,
dentro da janela); (2) **reordena `ordem` automaticamente, sem aprovação** — regra com maior
conversão real passa a ser checada primeiro no fallback por palavra-chave (`ConciergeService`
já usa `ORDER BY ordem ASC`, confirmado por leitura de código antes de mexer — não é uma coluna
morta); regra sem dado suficiente fica no fim, ordem relativa entre si preservada (sort
estável); (3) quando `score_base*10` diverge da taxa observada acima do limiar E a amostra é
grande o suficiente, gera 1 sugestão pendente. `decideRecalibrationSuggestion()` resolve a
regra atual **pelo `tag_resultante`, nunca pelo `rule_id` bruto** — tolerante ao replace-all
ter trocado o id entre a sugestão nascer e ser decidida; se a regra já não existe mais com
aquela tag, marca a sugestão como descartada automaticamente (`outcome:'stale'`) em vez de
travar ou aplicar no vazio.

UI: `SegmentQualificationRulesModal.tsx` (Master) e `/crm/config/ia` (tenant) — cada regra
ganha uma linha discreta de estatística ("N leads reais · M fechados · X% conversão real
(90d)", ou "sem leads reais ainda") e, quando há sugestão pendente, um card amarelo inline
("score 9 → 1... baseado em N leads") com Aplicar/Descartar — nunca uma tela separada, fica
junto da regra que está sendo avaliada.

**Testado ao vivo, ponta a ponta, com dado real** (tenant Marketing Digital, segmento
Imobiliário): 3 regras de teste inseridas via SQL direto no segmento real (nunca através do
replace-all do Master, pra não arriscar as 7 regras reais de produção) + 1 regra de teste via
a API REAL do tenant (`saveRule`) — 40 leads reais de teste (10% de conversão cada tag,
divergindo forte de `score_base=9`) → cron real rodado 2x: 1ª rodada gerou as 3 sugestões
segmento + reordenou (as 3 regras com dado real foram pra frente das 7 regras reais sem dado
— confirmado que a ordem RELATIVA das 7 regras reais entre si não mudou, sort estável); 2ª
rodada, após dismiss de uma, gerou-a de novo corretamente (divergência real ainda existe —
comportamento certo, não bug) e recolheu a nova sugestão do tenant. **Caminho aplicar**
(segmento, via API) → `score_base` 9→1 real, status `APPLIED`. **Caminho descartar**
(segmento) → `score_base` inalterado, status `DISMISSED`. **Caminho stale** — regra deletada
diretamente (simulando o replace-all) entre a sugestão nascer e ser decidida → `apply`
retornou `outcome:'stale'`, sugestão marcada descartada automaticamente, zero erro. **Caminho
tenant** (via `/api/crm/config/ia`, ações reais `applyRecalibration`) → mesmo resultado,
isolado corretamente do escopo segmento (GET do tenant nunca mostrou a sugestão do
segmento). **Ownership** — JWT de segmento errado (Master) e de tenant errado → 403 nos dois
casos. **UI real, clique a clique** (sessão Master real): modal mostrou as 9 regras com
estatística real inline, card de sugestão renderizado, clique em "Aplicar" persistiu
`score_base=1` no banco de verdade. Todo dado de teste removido (regras, leads, kanban,
sugestões, override do agente no segmento) e a **ordem original das 7 regras reais de
produção restaurada byte-a-byte** (confirmado por diff contra snapshot tirado antes do
teste). `npx tsc --noEmit`: 0 erros.

**Com isso, `docs/PLANO_AGENTES_ACELERACAO_CRM.md` está formalmente concluído — F0 a F5, os 5
agentes implementados, testados e documentados.** Todos ficam desligados por padrão (mesma
disciplina de nunca ativar automaticamente uma capacidade nova); ativar de verdade e escolher
os limiares reais fica com o usuário/Master, em `/admin/master/segments` → "Agentes de
Aceleração".

## 7. Decisões em aberto (para decidir antes de F0, não durante)

**Resolvidas nesta rodada** (ver §3.1/§3.2): separação intent/fit e o quanto a recalibração de
score deveria ser automática — ambas fechadas com desenho concreto, não ficam mais em aberto.

1. **Vocabulário de tag_sonho** (`docs/ANALISE_ACELERACAO_LEAD_VENDA_IA.md` §5) — F3
   (Next Best Action) é o ponto em que essa decisão passa a importar de verdade, porque o
   prompt do NBA pode querer referenciar a tag atual do lead como parte do raciocínio.
   Não bloqueia F0-F2.
2. **✅ Resolvida em F4.** Compliance por segmento no agente de Reativação — implementado
   exatamente como proposto: `requer_revisao_extra` (params do agente, tenant ou segmento)
   nunca libera envio automático mesmo aprovado, só registra rascunho revisado pra cópia
   manual (`status='APPROVED_MANUAL'`). Testado ao vivo. Nenhum segmento tem a flag ativada
   ainda — decisão de ativar pra Saúde (ou outro) fica com o usuário/Master.
3. **Ainda em aberto, registrado com honestidade — não endereçado em F1/F2/F4.** F1
   (`speed_to_lead`) e F2 (`stage_stagnation`) notificam 1:1 (uma mensagem de WhatsApp/Slack
   por lead disparado), não em digest agrupado como esta seção original propunha. Não chegou a
   ser um problema real nos testes desta sessão (volume baixo de dado de teste), mas um tenant
   com muitos leads estagnados ao mesmo tempo pode gerar uma enxurrada de mensagens — mudar
   pra digest exigiria alterar `recordAndNotify()`/o padrão de notificação de F1/F2, não
   tentado nesta rodada.
