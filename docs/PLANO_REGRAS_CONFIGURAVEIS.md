# Plano: Regras de Negócio 100% Configuráveis, Lógica Única e Testada

Status: **PROPOSTA — aguardando aprovação.** Nada foi implementado.
Escopo: todo literal que decide algo na aplicação (limiares, pesos, janelas, multiplicadores,
faixas de score, textos de decisão/alerta/recomendação), a unificação de lógicas divergentes e
a eliminação de código duplicado que deveria existir uma única vez.

---

## 0. Diagnóstico (resumo verificado)

Foram encontrados, por leitura de código e busca direta:

| Problema | Evidência | Impacto |
|---|---|---|
| Critério de CPL crítico reescrito em ~6 lugares | `wastedSpendService.ts:164,176`, `auditReportService.ts:591`, `segmentIntelligenceService.ts:113`, `portfolio/route.ts:85`, `portfolio/cross-insights/route.ts:412`, `dashboard/segment/route.ts:100`, `portfolio/page.tsx:203` | Mesmo CPL é "crítico" numa tela e "aviso" em outra |
| Operadores divergentes | crítico com `>` em `dashboard/segment` e `>=` em `cross-insights`/`portfolio` | Limite exato classificado diferente por tela |
| Fator de aviso só em uma tela | `dashboard/segment/route.ts:101` usa `cplIdeal*1.15`; `cross-insights:413` não | Status de "atenção" depende da tela |
| CTR de referência fora do banco | `cross-insights/route.ts:131-132` usa 1.5 e 0.8, enquanto o banco tem `ctr_min` 1.0 | Benchmark contraditório |
| Três definições de "lead fraco/qualificado" | `aiInsights` (`avg_fit_scale_min`=40 do banco), `weeklySummaryService` (45/65 literais), `revenueAttributionService.ts:138` (45 no SQL) | Mesmo lead qualificado num relatório e fraco em outro |
| Leitura de SLA/limites com `parseInt(x) \|\| default` | `distributionEngine.ts:81-84`, `transbordo/route.ts:33-35` | Valor `0` vira o padrão silenciosamente |
| Round-robin ignora o SLA configurado | `roundRobinStrategy.ts:13` lê `slaMinutos` que o engine nunca passa | SLA do tenant ignorado nessa estratégia |
| Transbordo lê configuração sem tenant | `transbordo/route.ts:32` (`LIMIT 1`, sem filtro) vs `distributionEngine.ts:78` (filtra) | Em multi-tenant, todos usam a configuração de uma linha qualquer |
| Tenant padrão fixo | `distributionEngine.ts:48` UUID `...0001` quando contexto sem tenant | Lead pode ser roteado para tenant errado |
| PIN de aprovação com `Math.random()` | `crm/agents/runner.ts:172`, `reallocationEngine.ts:307`, `agentDecisor.ts:95` | Autorização de envio/ação com gerador não criptográfico |
| Segredo de fallback no cron | `api/cron/transbordo/route.ts:21` (`your-secret-key`) | Endpoint acessível com segredo público se env ausente |
| Seed usado em runtime | `benchmarkResolver.ts:124-131` (camada 5) apesar do comentário "não usados em runtime" | Valor de código decide quando o banco está incompleto |
| Hardcode de segmento | `dashboard/funnel/diagnosis:49` ("Imóveis"); `crm/analytics/insights:102-103` ("crédito"/"financiamento"); `crm/leads:353` (coluna `entendimento_dor`) | Regra imobiliária em código genérico |
| Duplicação de default | `scoreRecalibrationAgent.ts:22-24` repete `90/30/10` fora da constante do serviço | Divergência silenciosa ao alterar um lado |
| Duplicação de geração de PIN e validade 24h | 3 serviços + 2 rotas de aprovação | Regra de expiração pode divergir |

---

## 1. Princípios

1. **Fonte única de verdade por regra.** Uma regra de decisão existe em um único módulo e é
   chamada por todos os consumidores. Nenhuma tela ou serviço reimplementa critério.
2. **Configuração no banco, com seed explícito.** Todo limiar vem de tabela. O valor de
   fábrica é gravado por migração (`INSERT ... ON CONFLICT DO NOTHING`), não lido de código em
   runtime. Ausência de configuração = erro explícito e visível, nunca valor silencioso.
3. **Zero é valor válido.** Proibido `x || default` para parâmetros numéricos. Usar
   `x ?? default` apenas quando o default é intencional e documentado, e preferir erro.
4. **Textos são templates editáveis**, com placeholders validados. Nenhuma frase de decisão
   fica escrita dentro de função.
5. **Mecanismo permanece em código.** Não entram no banco: formato de JSON, nomes de coluna,
   tamanho de buffer, códigos HTTP, estrutura de estados da máquina de estados (a transição
   em si é código; quando disparar é configuração).
6. **Segurança não é configurável.** Tamanho e validade de PIN, geração de segredos e de
   tokens: fixos em código, sempre criptográficos. Validade pode ser configurável dentro de
   um intervalo mínimo e máximo gravado em código como guarda.

---

## 2. Arquitetura proposta

### 2.1 Módulo central de regras (`src/lib/rules/`)

```
src/lib/rules/
  ruleRegistry.ts      -> catálogo: chave, tipo (number|pct|brl|days|enum|text), unidade,
                          descrição, faixa válida (min/max), escopo (segmento|rede|tenant|cliente)
  ruleResolver.ts      -> resolve valor efetivo com cascata cliente > tenant > segmento(+rede);
                          retorna { value, source } para auditoria; lança RuleMissingError
                          se não houver valor (sem fallback silencioso)
  ruleCache.ts         -> cache por requisição (mesmo escopo resolvido uma vez por rodada)
  statusClassifier.ts  -> classificação ÚNICA de status (ok|warn|critical|nodata) por
                          métrica vs benchmark, usada por TODAS as telas e serviços
  templateRenderer.ts  -> renderiza templates de texto com placeholders validados
  pinService.ts        -> geração/validação de PIN com crypto.randomInt, validade e
                          tentativas limitadas; único ponto de geração do sistema
  scoreBands.ts        -> faixas de score (auditoria, fit) como regra configurável
```

Todos os serviços passam a importar estes módulos. Nenhum serviço contém comparação de limiar
ou frase de decisão.

### 2.2 Persistência

**2.2.1 Limiares numéricos → `system_benchmarks` (já existe, expandida).**
Mantém a cascata atual (cliente > tenant > segmento+rede > segmento). Acrescentar chaves
faltantes. Todas com seed por migração para os 6 segmentos existentes, com os mesmos valores
hoje em vigor (mudança de zero comportamento).

Chaves novas propostas (lista completa a confirmar na fase 1):

- Fit (três chaves, uma por decisão de negócio — decisão 2 confirmada):
  - `fit_public_weak_max` (45): lead fraco para ajuste de público (fit de captação).
  - `fit_scale_min` (já existe como `avg_fit_scale_min`, 40): fit médio mínimo para escalar verba.
  - `fit_queue_strong_min` (65): prioridade alta na fila de atendimento (ordenação, não corte).
  - Lead sem `score_fit` fica fora das três contas. Nunca entra como zero nem como neutro.
- Amostra e prazo: `min_leads_for_rule` (5), `min_days_no_deal` (14), `max_actions_per_campaign` (3).
- Radar de demanda: `demand_high_threshold` (50).
- Realocação: `realloc_window_days` (14), `realloc_circuit_threshold` (3),
  `realloc_circuit_window_days` (90), `realloc_confirm_ratio` (0.5),
  `realloc_measure_delay_days` (14), `realloc_score_gap_norm` (50),
  `realloc_score_leads_weight`, `realloc_score_days_weight`.
- Desperdício: `waste_learning_fraction` (0.35), `waste_good_cpl_fraction` (0.5),
  `waste_fatigued_cap` (0.8), `waste_days_multiplier` (2).
- Funil: `funnel_tof_share_min` (0.5), `funnel_tof_ctr_min` (1.0), `funnel_mof_share_min`
  (0.3), `funnel_mof_ltr_min` (2.0), `funnel_bof_share_min` (0.2), `funnel_bof_cvr_min` (5.0).
- Estado da campanha: `fatigue_freq_max` (3.5, hoje distinto de `frequency_max`),
  `fatigue_ctr_drop_pct` (0.30), `learning_min_days` (7), `learning_min_conversions` (50).
- Sinais: `signal_cpm_delta_pct` (0.20), `signal_freq_saturation` (3.5),
  `signal_freq_headroom` (3.0), `signal_cpm_headroom_pct` (0.10).
- Escala e multiplicadores: `cpl_critical_multiplier` (2.5), `spend_no_lead_fraction` (0.4),
  `cpc_trend_up` (1.15), `cpc_trend_down` (0.85), `warn_cpl_factor` (1.15).
- CTR: unificar `ctr_min` (remover 1.5/0.8 literais de `cross-insights`).
- Auditoria: `audit_score_ok` (70), `audit_score_warn` (45), `audit_score_pass` (40),
  `audit_tracking_critical` (50), `audit_impact_high` (30), `audit_creative_critical` (50).
- Tracking health: pesos dos 7 checks, `tracking_latency_ms` (3000), `tracking_dup_ip_pct`
  (20), `tracking_orphan_pct` (30), `tracking_orphan_warn_pct` (10).
- Pesos de confiança das regras: um par `confidence_base` e `confidence_slope` por regra
  (ver 2.2.2).

**2.2.2 Regras de decisão → nova tabela `segment_decision_rules`.**
Uma linha por (segmento, regra). Colunas: `rule_key` (SCALE_BUDGET, PAUSE, ADJUST_AUDIENCE,
REVIEW_QUALIFICATION, PRODUCE_ANGLE, SWAP_ANGLE, etc.), `is_active`, `priority`,
`thresholds jsonb` (chaves referenciadas por `ruleRegistry`), `confidence_base`,
`confidence_slope`, `confidence_cap`, `action_type`, `requires_approval`.

Assim, "quando disparar" e "com que confiança" ficam editáveis, e a lógica de disparo
continua em código como função pura que recebe os limiares.

**2.2.3 Textos → `system_prompt_templates` (já existe; reaproveitada).**
Já tem cascata global > segmento > tenant > cliente, editor no Master (`/admin/master/prompts`)
e overrides no tenant (`/crm/config/ia`, via `PromptOverrideCard`). Ganha novos `template_key`
para cada texto de decisão. Campos padronizados: `variables` (lista declarada) e `content`.
O renderizador valida que todo placeholder usado existe na lista declarada e que nenhum
placeholder declarado fica sem uso.

Não se cria tabela nova para texto: reaproveitar o mecanismo já testado.

**2.2.4 Gatilhos e parâmetros de CRM.** `crm_agentes_config_segmento/tenant.params` já é
JSON editável. Os literais de CRM (30/240 min, fator 3/6, janela 6h, 7 dias, cooldown 30 dias,
teto 20/90, 5 atividades, janela de recalibração 90, divergência 30, amostra 10) entram como
`paramHints` com validação de faixa, e o código para de usar constante de fallback.

**2.2.5 Parâmetros de tenant hoje em `parametros_imoveis`.** Consolidar leitura em um único
resolvedor (`resolveTenantParams(tenantId)`). Remover o `LIMIT 1` global e o `parseInt||default`.

---

## 3. Política de valor ausente (fail loud)

- `ruleResolver` lança `RuleMissingError` com a chave e o escopo quando não há valor na cascata.
- Em tela, o erro vira estado visível ("regra X não configurada para este segmento"), nunca
  um número inventado.
- Em job/cron, o erro é registrado no log estruturado e a execução daquela regra é pulada
  para aquele escopo, sem derrubar o restante.
- **Migração garante que nenhuma regra ativa fique sem valor**: teste de integridade (seção 6)
  falha se qualquer segmento ativo tiver regra sem seed.

Fallback global em código é removido (`SEGMENT_SEED_DEFAULTS` deixa de ser lido em runtime;
passa a existir só como fonte de seed das migrações).

---

## 4. Unificação de lógicas e eliminação de duplicidades

### 4.1 Classificação de status (ponto único)
`statusClassifier.classify(metric, benchmark)` retorna `ok | warn | critical | nodata`.
Regra única: `critical` quando `value > cpl_critical` (escolha de operador a confirmar — ver
seção 9); `warn` quando `value > cpl_ideal * warn_cpl_factor`; caso contrário `ok`. Substitui:
- `wastedSpendService.ts:164,176`
- `auditReportService.ts:591`
- `segmentIntelligenceService.ts:113`
- `portfolio/route.ts:85` (`computeStatus`)
- `portfolio/cross-insights/route.ts:412-413`
- `dashboard/segment/route.ts:100-101`
- `portfolio/page.tsx:48-51,201-203` (UI passa a receber o status pronto da API; zero lógica no front)
- `cross-insights/page.tsx:210` (faixas do índice de eficiência viram parâmetro da API)

### 4.2 Fit (uma chave por decisão)
- `weeklySummaryService` e `revenueAttributionService` (SQL) usam `fit_public_weak_max`.
- `aiInsights` (escala de verba) usa `fit_scale_min`.
- Fila de atendimento do CRM usa `fit_queue_strong_min` para ordenar.
- O SQL recebe o limiar como parâmetro bind, nunca literal.
- Testes: lead sem `score_fit` fica fora de cada conta; mudar uma chave não altera as outras.

### 4.3 Resolução de configuração do tenant (ponto único)
`resolveTenantParams(tenantId)` substitui as 4 leituras de `parametros_imoveis`
(`distributionEngine`, `transbordo`, `geoAreaStrategy`, rotas públicas). Todas com filtro de tenant.

### 4.4 Resolução de benchmark (ponto único)
`benchmarkResolver.resolve(key, scope)` é o único caminho. Remove a camada 5 (seed em runtime).
Remove a leitura direta de `system_benchmarks` feita por rotas (`portfolio/route.ts` e
`cross-insights` fazem SQL próprio hoje). Passam a usar o resolvedor.

### 4.5 Geração e validação de PIN (ponto único)
`pinService.issue({ entity, ttlMinutes })` e `pinService.verify(...)`, com `crypto.randomInt`,
comparação de tempo constante (`crypto.timingSafeEqual`), limite de tentativas e expiração.
Substitui:
- `crm/agents/runner.ts:172-173` e rota `crm/agent/approve/[id]/route.ts` (validade, comparação)
- `reallocationEngine.ts:307-308`
- `agentDecisor.ts:95-96`
- Avaliar também `twoFactorAuthService.ts:98` e `unifiedTwoFactorAuthService.ts:201` e
  `emailService.ts:249`, `forgot-password/request/route.ts:52`, `usuarios/[id]/2fa/route.ts:81`
  (geram código 2FA/recuperação com `Math.random()`). **Estes são de autenticação, fora do
  escopo de regra de negócio, mas são o mesmo defeito e entram na fase de segurança (fase 0).**

### 4.6 Segredo de cron
Remover fallback literal. Sem `CRON_SECRET` definido, o endpoint responde 500 com erro claro
no boot (validação de env na inicialização). Mesmo tratamento para todas as rotas `api/cron/*`
e `api/cron/campanhas/*` (verificar lista completa na fase 0).

### 4.7 Tenant padrão
Remover `tenantId = '...0001'` em `distributionEngine.ts:48`. Contexto sem tenant é erro.

### 4.8 Estratégias de distribuição
- `roundRobinStrategy`: passa a receber o SLA do resolvedor, como as demais.
- `ownerOfAsset` e `plantonistaFallback` (`sla 0`, `expira null`): tornar explícito que é
  "atribuição definitiva" como parâmetro da estratégia, configurável por segmento, em vez de
  constante escondida.
- `isAutoAceite` (`prospectRouter.ts:184`): regra de aceite passa a vir de `segment_distribution_strategies.config`.

### 4.9 Limiares de CRM
`pendenciaAtendimentoAgent`, `reactivationAgent`, `nextBestActionAgent`, `scoreRecalibration`:
leitura via `crm_agentes_config_*.params` + `ruleResolver`. Remover as constantes `*_DEFAULT`
de código e os `paramHints` duplicados (`scoreRecalibrationAgent.ts:22-24`). Uma única fonte:
o hint lê a constante exportada do serviço ou, melhor, o seed da migração.

### 4.10 Textos
Cada frase de decisão migra para template (seção 5). Os helpers de formatação (`fmtBRL`,
`formatDuration`, `formatRelative`) continuam em código: são formatação, não regra. Existem
hoje pelo menos 4 versões de formatação de duração e de moeda (`wastedSpendService`,
`nextBestActionAgent`, `runner`, `pendenciaAtendimentoAgent`); unificar em `src/lib/format/`.

### 4.11 Hardcode de segmento
- `dashboard/funnel/diagnosis:49` ("Imóveis") → variável `{{vocabulary}}` vinda de
  `system_segments.vocabulary` (campo já existe em `dashboard/segment/route.ts:132`).
- `crm/analytics/insights:102-103` ("crédito"/"financiamento") → cada segmento declara seus
  termos de "ação de suporte" em configuração (ou a regra sai da rota genérica e vira template
  do segmento).
- `crm/leads:353` (coluna `entendimento_dor`) → o estágio inicial de qualificação passa a ser
  flag na coluna (`kanban_colunas.is_qualification_entry`) em vez de nome.

### 4.12 Duplicidade de classe de agente
`LeadGuardian` (`src/lib/guardian/`) e o worker removido (`lead-router-sla-worker`) já foram
descontinuados em 2026-07-21, mas o código permanece. `guardian/config.ts` ainda diz "NO
HARDCODING". Remover o código morto e confirmar com grep que não há importador.

---

## 5. Catálogo de textos (templates)

Cada template recebe `template_key`, `variables` declaradas e fallback global. Lista inicial
derivada do inventário (não exaustiva; a fase 1 fecha a lista):

| Grupo | Exemplos de template_key |
|---|---|
| Resumo semanal | `weekly_action_adjust_audience`, `weekly_action_scale_budget`, `weekly_action_review_qualification`, `weekly_action_produce_angle`, `weekly_action_swap_angle`, `weekly_reason_*` |
| Insights de campanha | `insight_title_<rule>`, `insight_desc_<rule>`, `insight_action_<rule>` (ex.: CTR baixo, fadiga, CPC alta, gasto sem resultado, hook fraco, CPL crítico) |
| Cross-insights | `cross_action_verify_budget`, `cross_insight_transfer_pattern`, `cross_insight_ctr_high` |
| Desperdício | `waste_recovery_*` (pausar, otimizar, renovar criativos, consolidar orçamento, investigar lead barato) |
| Agentes CRM | `agent_pendencia_title_*`, `agent_stagnation_*`, `agent_reactivation_*`, `agent_nba_title` |
| Notificações WhatsApp/Slack | `notify_digest_*`, `notify_pin_*`, `notify_sla_breach` |
| Bot de mensageria | `bot_handoff_message`, `bot_fallback_message`, `bot_guardrail_tool`, `bot_guardrail_no_answer`, `bot_guardrail_photo`, `bot_empty_result_notice`, `bot_photo_none_notice` |
| Atribuição | `prospect_no_candidate`, `prospect_already_assigned`, `prospect_email_accept_hint` |

Regras de edição:
- Editável no Master (`/admin/master/prompts`), por segmento.
- Overrides por tenant e por cliente em `/crm/config/ia` (já existe via `PromptOverrideCard`).
- Guardrails do bot (`TOOL_GUARDRAIL` etc.) são os mais sensíveis: edição restrita a Master,
  com prévia de renderização antes de salvar e registro de versão.

---

## 6. Plano de testes rigoroso

### 6.1 Princípios do plano de testes
- **Teste antes de mudar.** Antes de qualquer migração de regra, capturar o comportamento
  atual com dados reais (snapshot). Toda regra migrada precisa produzir o mesmo resultado
  com os valores de fábrica. Mudança de resultado só é aceita quando intencional e aprovada.
- **Paridade por caracterização.** Para cada regra: suíte que roda a lógica antiga e a nova
  com o mesmo conjunto de entradas e compara saída. Remove-se a antiga só depois de paridade
  verificada.
- **Testes de propriedade** para classificadores (ex.: `classify` é monotônico em `value`;
  fronteira exata do limite).
- **Testes de integração contra o Postgres real** (não mock de banco), usando tenants de teste
  dedicados, nunca dados de produção.
- **Negativos obrigatórios**: ausência de configuração, valor `0`, valor negativo, string
  inválida, tenant ausente, expiração de PIN, PIN errado, PIN reutilizado.

### 6.2 Níveis
| Nível | Ferramenta | Escopo |
|---|---|---|
| Unidade | Vitest (a adotar; hoje não há suíte) ou ts-node + asserts | `statusClassifier`, `ruleResolver`, `templateRenderer`, `pinService`, `scoreBands`, funções puras de cada regra |
| Caracterização | Script com snapshot de entradas reais | paridade antiga x nova por regra |
| Integração | Postgres real + scripts (padrão já usado nas trilhas) | cascatas, cron, distribuição, aprovações |
| Ponta a ponta | Navegador real (dev server) | telas de Regimento, editor de templates, classificação exibida |
| Regressão de contrato | verificação de payload de API | campos e tipos não quebrados |

### 6.3 Matriz de casos por regra (exemplo: CPL crítico)
Para `statusClassifier.classify`:
- valor exatamente igual ao crítico (confirma operador escolhido)
- 1 centavo acima e abaixo da fronteira
- valor zero, nulo, negativo
- benchmark ausente (deve lançar `RuleMissingError`, não classificar)
- benchmark com `0` (valor válido, não default)
- mesmo cálculo em todas as telas: teste que compara a saída da API de portfólio, de
  cross-insights e do dashboard de segmento para o mesmo conjunto de dados — **devem ser
  idênticas**

Padrão aplicado a cada regra do inventário: fronteira, nulo, zero, ausente, sobrescrita por
tenant, sobrescrita por cliente, segmento sem override.

### 6.4 Testes de cascata
- Cliente sobrescreve tenant, que sobrescreve segmento, que sobrescreve padrão de rede.
- Cascata quebrada (valor só no padrão genérico) deve ser sinalizada, não silenciosa.
- Chaves desconhecidas em `thresholds` são rejeitadas na escrita.

### 6.5 Testes de templates
- Placeholder usado e não declarado → erro de validação na escrita.
- Variável declarada e não usada → aviso.
- Renderização com valor vazio, com acento, com HTML (deve escapar onde aplicável).
- Template ausente → erro explícito, nunca string vazia enviada ao cliente.
- Bot: guardrails renderizados corretamente no prompt de todos os segmentos.

### 6.6 Testes de PIN e aprovação
- Geração: PIN com 6 dígitos, faixa correta, distribuição (teste estatístico simples sobre
  muitas gerações, sem previsibilidade sequencial).
- Expiração exata no limite de tempo.
- Tentativas esgotadas bloqueiam.
- Comparação com tempo constante (verificação por inspeção + teste de uso de `timingSafeEqual`).
- Aprovação de ação já executada ou já expirada: rejeitada.
- Dupla aprovação concorrente: apenas uma executa (idempotência).

### 6.7 Testes de distribuição e transbordo
- SLA `0` respeitado (não vira padrão).
- Round-robin usa o SLA configurado (teste que falha com a implementação atual).
- Transbordo filtra por tenant: dois tenants com configurações diferentes, cada um processa
  com a sua.
- Tenant ausente no contexto lança erro.
- Cron sem `CRON_SECRET` falha no boot; com segredo errado responde 401.
- Lead sem candidato: comportamento documentado (registro + notificação), sem atribuição fantasma.

### 6.8 Testes de integridade do seed
- Para cada segmento ativo: toda chave obrigatória do `ruleRegistry` existe em
  `system_benchmarks` (ou escopo superior).
- Migração é idempotente: rodar duas vezes não altera valores já editados.
- Valores de fábrica idênticos aos valores atuais em uso (comparação com snapshot de antes
  da migração).

### 6.9 Testes de consistência entre telas (o teste que teria pego os bugs de hoje)
Para cada métrica classificada (CPL, CTR, fit, hook rate): o mesmo dado de entrada, passado
por portfólio, cross-insights, dashboard de segmento, auditoria, desperdício e insights de IA,
deve produzir o **mesmo status**. Teste de contrato que roda em CI.

### 6.10 Testes ponta a ponta (navegador)
- Editar um limiar em `/admin/master/segments` → Regimento → salvar → confirmar efeito na
  classificação exibida no dashboard.
- Editar um template em `/admin/master/prompts` → disparar a ação → confirmar texto.
- Override de tenant em `/crm/config/ia` → confirmar que o tenant vê o texto dele e o outro
  tenant não.
- Limpeza de dados de teste ao final (padrão já adotado no projeto), com verificação por SQL.

### 6.11 Critérios de aceite por fase
- Zero ocorrência do grep de literais proibidos nos arquivos migrados (lista de padrões
  definida na fase 1, verificada em CI).
- `npx tsc --noEmit` sem erros novos.
- Suíte de caracterização 100% verde antes de cada remoção de código antigo.
- Teste de consistência entre telas verde.

---

## 7. Fases de execução

**Fase 0 — Segurança e bugs isolados** (independente da migração; aprovada na sua pergunta 3)
- Substituir `Math.random` de PIN por `pinService` (3 serviços de aprovação + 2 rotas).
  Avaliar e corrigir os geradores de 2FA/recuperação (ver 4.5).
- Remover fallback `your-secret-key`; validar `CRON_SECRET` no boot; listar todas as rotas cron.
- Corrigir `parseInt || default` → tratar zero explicitamente (distribuição e transbordo).
- Corrigir round-robin para usar o SLA configurado.
- Corrigir transbordo para filtrar por tenant.
- Remover tenant padrão fixo do `distributionEngine`.
- Testes: 6.6 e 6.7 completos; testes de regressão que reproduzem cada bug antes da correção.
- Critério: os testes de bug falham no código atual e passam após a correção.

**Fase 1 — Inventário fechado e snapshot**
- Concluir a leitura linha a linha pendente (`aiInsights` 780 linhas, `agentDecisor`,
  `campaigns/route.ts`, `criativos/*`, `leads/stats`, `realocacoes`, `auditoria`,
  `genericResolver`, `knowledgeBase`).
- Gerar a lista final de chaves do `ruleRegistry` e de `template_key`.
- Capturar snapshot de comportamento atual (entradas reais anonimizadas + saídas).
- Decisões pendentes (seção 9) resolvidas.
- Critério: inventário assinado pelo usuário, snapshot reproduzível.

**Fase 2 — Núcleo de regras**
- Criar `src/lib/rules/*` (2.1), `segment_decision_rules` e as chaves novas em
  `system_benchmarks` (2.2.1, 2.2.2) com migração de seed.
- Testes unitários e de integridade do seed (6.2, 6.8).
- Nenhum consumidor migrado ainda.

**Fase 3 — Classificação e fit unificados** (itens 4.1, 4.2)
- Migrar todas as telas e serviços listados para `statusClassifier` e fit único.
- Testes de caracterização e de consistência entre telas (6.3, 6.9).
- Corrigir o CTR de referência (1.5/0.8) para usar `ctr_min`.

**Fase 4 — Resolvedores de configuração** (itens 4.3, 4.4, 4.9)
- `resolveTenantParams`, resolvedor de benchmark sem camada 5, parâmetros de CRM via `paramHints` validados.
- Testes de cascata (6.4).

**Fase 5 — Regras de decisão em tabela** (2.2.2 e migração dos disparos)
- Migrar os disparos de PAUSE, DOWNSCALE, SCALE, REFRESH, ADJUST, USE_LOOKALIKE, realocação,
  desperdício, funil, estado da campanha, sinais.
- Testes de caracterização por regra (6.3).

**Fase 6 — Textos em templates** (seção 5)
- Migrar cada frase para `system_prompt_templates`, com validação de placeholders.
- Testes de template (6.5) e prévia no editor.
- Remover os literais de texto dos arquivos migrados.

**Fase 7 — Estratégias de distribuição e CRM** (4.8, 4.11, 4.12)
- Aceite automático, atribuição definitiva, hardcode de segmento, remoção de código morto (guardian).
- Testes de distribuição (6.7).

**Fase 8 — Duplicidade de formatação e utilidades** (4.10)
- `src/lib/format/` único. Substituir as 4 implementações.

**Fase 9 — Verificação final**
- Grep de literais proibidos em CI.
- Suíte completa (6.1–6.10).
- Ponta a ponta no navegador com tenants de teste.
- Limpeza dos dados de teste.

Cada fase termina com commit próprio, testes verdes e sua verificação; não se avança sem o
critério da fase atendido.

---

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Mudança silenciosa de resultado em produção | Snapshot antes da migração; paridade por caracterização; valores de seed idênticos aos atuais |
| Segmento ativo sem configuração após migração | Teste de integridade do seed (6.8) bloqueia o deploy |
| Templates editados pelo Master quebram o envio | Validação de placeholders na escrita + prévia + fallback global seguro |
| Mais consultas ao banco por rodada | Cache por requisição no `ruleResolver` (2.1) |
| Testes inexistentes no projeto (não há suíte automatizada) | Fase 0 instala a infraestrutura de teste antes de tocar em regra |
| Operadores de CPL crítico: `>` vs `>=` | Decidir na fase 1 (ver seção 9) e cobrir a fronteira em teste |

---

## 9. Decisões que preciso de você

1. **Operador do CPL crítico:** `>=` — **confirmado.**
2. **Fit:** três chaves separadas — **confirmado** (ver 4.2).
3. **Guardrails do bot:** só Master, editados no Editor de Prompts existente, com prévia — **proposta aceita**.
4. **Pacote de testes:** Vitest para regras puras + scripts de integração contra Postgres de teste — **proposta aceita**.
5. **Ordem:** fase 0 primeiro — **confirmado.**

---

## 10. Estimativa e entregáveis

Não estimo em horas; a ordem de grandeza é: fase 0 e fase 1 curtas; fases 2 a 6 são o grosso;
fases 7 a 9 são de limpeza e verificação. Cada fase gera:
- código migrado;
- testes automatizados correspondentes;
- migração SQL versionada (sem `prisma db push`, conforme o CLAUDE.md);
- atualização da documentação viva (`docs/`) e do `CLAUDE.md` quando a regra mudar.
