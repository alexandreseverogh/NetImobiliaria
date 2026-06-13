---
name: project-llm-centralizacao-campanhas
description: "Decisão 2026-05-28 — modelo LLM dos insights de Campanhas é ÚNICO e global da plataforma (linha global da Settings). Planejado, não implementado."
metadata: 
  node_type: memory
  type: project
  originSessionId: ca813b0e-9136-4a5f-99cd-14039306466e
---

Decisão de produto (2026-05-28): o modelo de LLM dos insights de IA do módulo de Campanhas deixa de ser self-service/pago por tenant e passa a ser **um modelo ÚNICO e global da plataforma** — um só provider, um só modelo, uma só chave, para todos os tenants.

**Why:** reduzir complexidade técnica/operacional do onboarding (tenant não precisa de chave própria) e dar à plataforma controle de custo/qualidade/padronização.

**How to apply:** plano reescrito em `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` seção **1.5** (v1.2). Ainda **NÃO implementado** — só planejamento. Design final (após sucessivas simplificações):
- **SEM tabela nova** e **SEM coluna nova**. A ideia inicial de `tenants.llm_trafego_pago` + campo no CRUD de Tenants foi **CANCELADA** pelo próprio usuário.
- Config central = **uma linha global da tabela `Settings`** (schema `campanhasmarketingdigital`) com `tenant_id IS NULL`, usando as colunas existentes `llmProvider`/`llmModel`/`llmApiKey`. (Postgres permite múltiplos NULL em UNIQUE → garantir 1 linha por lógica de app ou índice único parcial.)
- Resolver: trocar `getLlmClient(tenantId)` por `getLlmClientForCampaigns()` (SEM tenantId) em `src/lib/marketing/services/llmClient.ts` + `src/lib/intelligence/llmInvoker.ts`. Lê a linha global; fallback `.env` (ANTHROPIC_API_KEY). Repontar os 3 pontos LLM (briefing, agente enrichWithClaude, teste de conexão).
- Página `/admin/campanhas/configuracoes` (self-service do tenant): gestor pediu **manter editável porém ignorada** pelo resolver de campanhas.
- O campo `ai_config` (groq/gemini/preferred_model) que já existe no CRUD de Tenants **fica intacto** — serve a outros módulos, não às campanhas.
- Onde o Master edita o modelo global: **UI Master dedicada `/admin/master/ia-plataforma`** (seção 1.5.9 do plano), com provider/modelo (dropdowns data-driven de LlmModel) + API key mascarada + "Testar Conexão". Endpoints GET/PUT/test em `/api/admin/master/ia-plataforma`. Guard de nível Master. NÃO no CRUD de Tenants. Seed SQL na 1ª carga.

Status fases (plano mestre): FASES 0–3 concluídas; centralização retroage nelas. Relacionado: [[project-fase0-implementado]].
