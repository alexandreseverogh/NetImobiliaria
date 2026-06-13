---
name: project-fase0-implementado
description: FASE 0 implementada em 2026-05-26 — fundação multi-segmento e gestão de prompts no net-imobiliaria
metadata: 
  node_type: memory
  type: project
  originSessionId: 956b4c13-f695-4c12-89f7-5a9e8750b5f3
---

FASE 0 da plataforma net-imobiliaria implementada e migração executada com sucesso em 2026-05-26.

**Why:** Fundação para suportar múltiplos segmentos (imobiliário, saúde, carros, geral) sem hardcoding. Prompts LLM gerenciados no banco, benchmarks resolvidos em 4 camadas.

**How to apply:** Continuar a partir das FASES seguintes no plano mestre (`docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md`).

## O que foi feito

### DB (migração: `prisma/migration-2026-05-fase0-fundacao.sql`, já executada)
- `system_segments`: +4 colunas JSONB (`vocabulary`, `funnel_stages`, `creative_taxonomy`, `primary_kpis`) — seeds para imobiliaria, saude, carros, geral
- `clientes`: +`segment_id` UUID FK → system_segments
- Tabela `system_prompt_templates`: prompts versionados por segmento (NULL = global fallback)
- Tabela `system_benchmarks`: 32 rows — 8 métricas × 4 segmentos
- Tabela `tenant_benchmark_overrides`: camada 2 de resolução de benchmarks
- Tabela `client_benchmark_overrides`: camada 1 (mais específica)

### Intelligence Layer (`src/lib/intelligence/`)
- `segmentResolver.ts`: resolve segmento efetivo (cliente → tenant → geral)
- `benchmarkResolver.ts`: 4 camadas (cliente → tenant → segmento → fallback hardcoded)
- `promptResolver.ts`: 2 camadas (segmento-específico → global)
- `promptRenderer.ts`: substituição de `{{variáveis}}`
- `llmInvoker.ts`: orquestra tudo — resolve template, renderiza, chama LLM do tenant

### Refactors (sem quebrar funcionalidade existente)
- `aiInsights.ts`: thresholds agora vêm de `benchmarkResolver` (antes hardcoded)
- `strategicBriefing.ts`: `buildPrompt()` substituída por `invokeForContext()` via `llmInvoker`
- `agentDecisor.ts`: `enrichWithClaude()` agora usa template `agent_enrich` do banco

### APIs novas
- `GET /api/system/segments` — lista segmentos ativos (para selectors, nunca hardcode)
- `GET/POST/DELETE /api/admin/campanhas/intelligence/benchmarks/tenant` — overrides do tenant
- `GET/POST/DELETE /api/admin/campanhas/intelligence/benchmarks/client` — overrides por cliente
- `PATCH /api/admin/campanhas/clients` — atualiza segment_id do cliente

## Templates de prompts disponíveis
| key | scope |
|-----|-------|
| briefing_morning | global + imobiliaria |
| briefing_closing | global + imobiliaria |
| briefing_manual | global |
| agent_enrich | global + imobiliaria |
