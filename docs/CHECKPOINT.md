# CHECKPOINT — Estado Atual do Projeto

> **Atualizado em:** 2026-05-28
> **Propósito:** Garantir continuidade entre sessões, modelos, contas e computadores.
> **Regra:** atualizar ao final de cada sessão antes de fechar.

---

## Última tarefa concluída

### Centralização LLM das Campanhas (2026-05-28)

Implementado um único modelo de IA global para todos os insights de campanhas da plataforma:

- **`getLlmClientForCampaigns()`** em `src/lib/marketing/services/llmClient.ts`
  - Lê `campanhasmarketingdigital."Settings" WHERE tenant_id IS NULL`
  - Fallback para `ANTHROPIC_API_KEY` do env se nenhuma config global existir
- **3 pontos de chamada atualizados** para usar a função global:
  - `src/lib/intelligence/llmInvoker.ts`
  - `src/app/api/admin/campanhas/settings/llm/test/route.ts`
  - `src/app/api/admin/master/ia-plataforma/test/route.ts`
- **UI Master** criada em `src/app/admin/master/ia-plataforma/page.tsx`
  - GET/PUT em `/api/admin/master/ia-plataforma`
  - Teste de conexão em `/api/admin/master/ia-plataforma/test`
- **Sidebar** — item "IA da Plataforma" ativo via `system_features` (`category_id=22`, `url=/admin/master/ia-plataforma`)
- **SQL** — `database/migration-2026-05-llm-centralizacao.sql` (índice único + seed linha global)

### ModulesListModal — Componente Reutilizável (2026-05-28)

- Criado `src/components/admin/master/modules/ModulesListModal.tsx`
  - Props: `isOpen`, `onClose`, `modules: ModuleItem[]`
  - Read-only, exibe nome + slug + contagem de categorias
- Usado em `src/app/admin/master/tenants/page.tsx`:
  - Stat "Sistemas Ativos" dinamizado: `availableModules.length + " Módulos"` (era hardcoded "3 Motores")
  - Botão "Visualizar Módulos" abre o modal

---

## Tarefa em andamento

**Testes das Fases 0–3 do módulo de campanhas**

Configuração atual: provider `groq`, modelo `llama-3.3-70b-versatile` (gratuito) configurado em Master → IA da Plataforma.

Ainda não testados end-to-end:
- [ ] `POST /api/admin/campanhas/briefings/generate` — Briefing estratégico (morning/closing/manual)
- [ ] Agente Decisor — `enrichWithClaude()` via `llmInvoker.ts`
- [ ] `POST /api/admin/campanhas/desperdicio/narrativa` — Análise de Desperdício de Verba
- [ ] Templates de prompt configurados no sistema (`wasted_spend_explanation`, etc.)

---

## Próximos passos imediatos

1. Testar os 4 pontos LLM acima com o modelo Groq configurado
2. Validar que `invokeForContext()` em `llmInvoker.ts` usa corretamente a config global
3. Avançar para **FASE 4** do `PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` (Campaign State Machine)
4. Implementar **Seletor de Cliente** nas UIs — backend já filtra por `clientId` em todos os endpoints, mas as interfaces ainda não expõem o dropdown (ver seção TODO no CLAUDE.md)

---

## Decisões tomadas em 2026-05-28

| Decisão | Racional |
|---------|----------|
| LLM global usa `Settings WHERE tenant_id IS NULL` | Sem nova tabela/coluna; aproveita estrutura existente |
| Sidebar produção usa `system_features + system_categorias` | Função `get_sidebar_menu_for_user()` no banco é diferente do código — usa `system_features.url` como caminho de página |
| `CHECKPOINT.md` referenciado via `@import` no `CLAUDE.md` | Leitura automática em qualquer modelo e qualquer máquina após `git pull` |
| `ModulesListModal` como componente único em `src/components/admin/master/modules/` | Evitar replicação de código — reutilizável em outras páginas master |

---

## Pendências anteriores (ainda abertas)

- **Auditoria de permissões CRUD** — `CreateGuard`/`UpdateGuard`/`DeleteGuard` criados, apenas `clientes` protegido. Os demais 30+ módulos ainda sem proteção (ver lista completa no CHECKPOINT anterior).
- **Seletor de Cliente nas UIs** — ALTA PRIORIDADE. Backend pronto, frontend pendente.
- **Sync Meta real** — validar `POST /insights/sync` com token de produção.
- **Alerta de token Meta expirando** — campo `meta_token_expires_at` existe no tenant, falta notificação na UI.

---

## Referências

- `docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md` — Plano completo das 11 fases
- `docs/ACCESS_CONTROL.md` — Lógica de controle de acesso e sidebar
- `CLAUDE.md` — Documentação técnica principal (arquitetura, APIs, infra)
