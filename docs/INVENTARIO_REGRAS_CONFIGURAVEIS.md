# Inventário de literais de regra de negócio (Fase 1 — rascunho)

> Status: **rascunho parcial**. Gerado por leitura de `grep` nos arquivos de decisão.
> Ainda falta leitura linha a linha de: `criativos/*`, `leads/stats`, `auditoria`,
> `realocacoes`, textos de prompt e `campaigns/route.ts` (fluxo de criação).
> Assinatura do usuário pendente antes da Fase 2.

## 1. `src/lib/marketing/services/aiInsights.ts` (regras de decisão do agente)

| Chave proposta | Literal atual | Onde | Papel |
|---|---|---|---|
| `cpl_critical_multiplier` | `2.5 × cpl_ideal` (DOWNSCALE) | ~L335 | corta orçamento |
| `frequency_max` | `3` (fallback) | ~L277 | fadiga |
| `refresh_creative_frequency_factor` | `1.3 × frequency_max` | ~L351-363 | REFRESH_CREATIVE |
| `adjust_audience_ctr_factor` | `0.6 × ctr_min` | ~L368 | ADJUST_AUDIENCE |
| `adjust_audience_spend_factor` | `0.35 × spend_no_lead` | ~L369 | ADJUST_AUDIENCE |
| `refresh_creative_spend_factor` | `0.3 × spend_no_lead` | ~L355 | REFRESH_CREATIVE |
| `scale_budget_pct_default` | `20` | ~L193 | SCALE |
| `scale_budget_max_pct_default` | `25` | ~L195 | SCALE |
| `downscale_budget_pct_default` | `30` | agentDecisor L304 | DOWNSCALE |
| `hook_rate_min_default` | `12` | ~L328-332 | Hook Rate |
| `hook_rate_gap_weight` | `0.03` | ~L332 | confiança |
| `is_lost_budget_scale_min_default` | `20` | ~L387 | Impression Share |
| `min_days_running` (uso direto) | `3` (fallback em reallocation) | reallocationEngine L190 | elegibilidade |
| `min_leads_scale` (uso direto) | `5` | reallocationEngine L193 | elegibilidade |
| `avg_fit_scale_min` | `40` | ~L259 | qualidade de lead |
| `confidence_*` | fórmulas com `0.6`, `0.7`, `0.75`, `0.9`, `0.95` | todas as regras | confiança |
| `pause_*` | regras de PAUSE e thresholds de gasto | ~L240-300 | defensivo |

**Problema encontrado:** vários fallbacks `?? 12`, `?? 20`, `?? 25`, `?? 30` repetem
valores de `GLOBAL_FALLBACKS` (benchmarkResolver). Dois lugares para o mesmo número.
Ação na Fase 2: usar somente `benchmarkResolver`.

**Confiança:** as fórmulas `Math.min(0.9, 0.6 + ...)` são literais de regra, não de
configuração. Proposta: mover o piso, o teto e o peso para a tabela de regras.

## 2. `src/lib/marketing/services/agentDecisor.ts`

| Literal | Onde | Papel |
|---|---|---|
| `AGENT_CONFIDENCE_THRESHOLD` = `0.85` (env) | L19 | limiar global, **env** (não tabela) |
| `DEFENSIVE_TYPES` / `OFFENSIVE_TYPES` | ~L30-45 | classificação de risco (código) |
| `getAngleInsights(7, ...)` | L62 | janela de 7 dias |
| janela de 24h para dedupe de ação | L74 | idempotência |
| `Math.max(1, Math.round(...))` | L309 | orçamento mínimo de 1 |
| `maxBudget = scale_budget_max ?? 0` | L341 | teto de escala |

**Decisão necessária:** `AGENT_CONFIDENCE_THRESHOLD` hoje é env, mas já existe
`tenants.agent_confidence_threshold` (L51). Dois mecanismos. Proposta: só o tenant.

## 3. `src/lib/marketing/services/reallocationEngine.ts`

| Literal | Onde | Papel |
|---|---|---|
| `WINDOW_DAYS = 14` | L26 | janela de avaliação |
| `min_days_running ?? 3` | L190-191 | elegibilidade |
| `min_leads_scale ?? 5` | L193 | elegibilidade |
| `frequency_max ?? 3` | L199 | teto de frequência do destino |
| `realloc_cooldown_days ?? 14` | L210 | cooldown |
| `realloc_min_cpl_gap_pct ?? 30` | L223 | ganho mínimo |
| `realloc_max_pct_of_source ?? 30` | L227 | teto de movimentação |

Esses já são configuráveis por benchmark, mas com fallback literal duplicado.

## 4. `src/lib/mensageria/tools/genericResolver.ts`

| Literal | Papel | Classificação |
|---|---|---|
| `max ?? 25`, cap 50 | teto de array por relação | **técnico** (proteção), manter |
| `maxRows` clamp 1–20 | teto de linhas | **técnico**, manter |
| `EPS = 0.005` | tolerância monetária | **técnico**, manter |
| `CAP = 30` | teto de candidatos na comparação | **técnico**, manter |

Nenhum destes é decisão de negócio: ficam no código.

## 5. `src/lib/mensageria/tools/knowledgeBase.ts`

| Literal | Papel | Classificação |
|---|---|---|
| `topK = 5` | resultados da busca | **parâmetro de negócio** (candidato a config) |
| peso `0.7` vetor / `0.3` texto | ranking híbrido | **parâmetro de negócio** (candidato a config) |
| teto `1200` chars por chunk | tamanho de trecho | técnico |

## 6. `src/app/api/admin/campanhas/campaigns/route.ts`

| Literal | Papel | Classificação |
|---|---|---|
| `ageMin || 18`, `ageMax || 65` | público padrão | **regra de negócio** (candidato: segmento) |
| `scheduleDays || [0..6]` | dias padrão | **regra de negócio** (candidato: segmento) |
| `dailyBudget × 100` | conversão de centavos | técnico |

## 7. Pendências de leitura (não inventariadas ainda)

- `criativos/*` — thresholds de saturação de hook e de padrão vencedor (provável).
- `leads/stats` — janela de agregação.
- `auditoria` — pesos do score (30/25/20/15/10 já citados no CLAUDE.md).
- `realocacoes` — critérios de exibição.
- Textos de prompt: parte já está em `system_prompt_templates`; resta confirmar
  o que ainda está hardcoded no código.

## 8. Decisões que este inventário pede do usuário

1. **Limiar de confiança:** apenas por tenant, removendo a env var
   `AGENT_CONFIDENCE_THRESHOLD`?
2. **Fallbacks literais:** aceitar que `GLOBAL_FALLBACKS` do `benchmarkResolver`
   seja a única fonte, e remover os `?? N` espalhados?
3. **Pesos de confiança (`0.6`, `0.75`...):** continuam no código como fórmula, ou
   viram parâmetros de regra?
4. **Parâmetros do bot** (`topK`, pesos RAG): entram na Fase 2 ou ficam para depois?
