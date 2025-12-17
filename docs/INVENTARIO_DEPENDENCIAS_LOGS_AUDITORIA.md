# Inventário de Dependências – Logs & Auditoria

**Versão:** 0.3  
**Data:** 08/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** captura, armazenamento, consulta e visualização de logs administrativos (login, auditoria, eventos de segurança), incluindo dashboards, exportação e purga controlada.
- **Objetivo:** garantir rastreabilidade completa das ações (Guardian Rules), monitorar tentativas suspeitas e oferecer ferramentas consolidadas de análise.
- **Componentes-chave:** tabelas `login_logs`, `audit_logs`, serviços `auditLogger`, `securityMonitor`, APIs `/api/admin/login-logs/*` e `/api/admin/audit`, páginas admin em `src/app/admin/login-logs/*`, dashboards analíticos e hooks de exportação.

## 2. Banco de Dados e Migrações
- **Tabelas principais:**
  - `login_logs` – registra tentativas de autenticação públicas e administrativas (campos: `user_id`, `username`, `action`, `ip_address`, `user_agent`, `two_fa_used`, `success`, `failure_reason`, `created_at`). Ações públicas de cadastro usam `action = 'register'` (sucesso) ou `action = 'register_failed'`, permitindo diferenciar novas inscrições de tentativas de login.
  - `audit_logs` – auditoria de CRUD (`user_id` para admins, `public_user_uuid` para clientes/proprietários, `action`, `resource`, `resource_id`, `details`, `ip_address`, `user_agent`, `timestamp`).
  - `security_alerts`/`security_events` (em memória via `securityMonitor`, persistência complementar em `login_logs`).
- **Scripts/documentos relevantes:**
  - `database/create_sidebar_tables.sql` (inclui features/logs).
  - `docs/IMPLEMENTACAO_AUTENTICACAO_PUBLICA_COMPLETA.md`, `docs/RELATORIO_CORRECAO_DEFINITIVA_CATEGORIAS.md`, `docs/PROBLEMA_BOTAO_2FA.md` (relatam ajustes em logging).
  - `database/TESTE_PRATICO_CORRECOES.sql`, `database/PLANO_ACAO_MELHORIA_PERMISSOES.md` (checagens cruzadas).
  - `scripts/sql/fase3_prepare_audit_logs.sql` (08/11/25 – criação de `public_user_uuid`).
  - `scripts/sql/fase3_audit_logs_uuid_only.sql` (08/11/25 – normalização final, remoção de `user_id_int`, índice em `public_user_uuid`).
  - `scripts/sql/fase3_login_logs_register_actions.sql` (08/11/25 – atualização da constraint `login_logs_action_check` para aceitar `register`/`register_failed`).
- **Índices recomendados:** `login_logs (created_at)`, `login_logs (user_id, action)`, `audit_logs (resource, timestamp)`, `audit_logs (public_user_uuid)` para consultas e dashboards.

### Status Atual (08/11/25)
- ✅ `login_logs.user_id` permanece UUID (FK para `users.id`) – eventos públicos continuam com `user_id` nulo e metadata nos detalhes.
- ✅ `audit_logs.user_id` reservado para admins; `public_user_uuid` armazena UUID de clientes/proprietários; coluna `user_id_int` removida.
- ✅ `scripts/sql/fase3_audit_logs_uuid_only.sql` executado: backfill de `user_type = 'admin'`, criação do índice `idx_audit_logs_public_user_uuid`, remoção de `user_id_int` e constraint garantindo `user_id` sempre presente para admins.
- ✅ Rotas públicas (`/api/public/auth/register`, `/api/public/auth/login`) registram eventos com `public_user_uuid` + `user_type` (`cliente`/`proprietario`), inclusive falhas (quando UUID ausente, `user_type` indica origem).
- ✅ UI de auditoria (`/admin/audit`) exibe volumetria consolidada (admin vs. público) e estatísticas filtradas.
- ⚠️ Pendências:
  - Validar relatórios/exportações externos para garantir uso de `public_user_uuid` ao invés de `user_id_int`.
  - Manter agregadores diferenciando eventos públicos sem UUID (login falho/usuário não encontrado) – contabilizados como `user_type` público com `public_user_uuid` nulo.
  - Revisitar necessidade futura de FK específica para usuários públicos (ex.: tabela unificada de identidades).

## 3. Serviços e Middleware
- **AuditLogger (`src/lib/audit/auditLogger.ts`):**
  - `logAuditEvent` insere registros em `audit_logs` (falha não derruba operação) aceitando agora `publicUserUuid` + `userType` para cenários públicos.
  - `extractRequestData` reutiliza utilitário de IP/UA (`ipUtils`).
- **SecurityMonitor (`src/lib/monitoring/securityMonitor.ts`):**
  - Mantém eventos em memória + consulta ao banco; gera alertas quando thresholds são excedidos; fornece estatísticas para dashboards.
  - Exposto via funções `logLoginAttempt`, `logSuspiciousActivity`, etc., usadas nas rotas de autenticação.
- **Integração com rotas de login:** `POST /api/admin/auth/login` e `POST /api/public/auth/login` registram eventos, incluindo 2FA.
- **Purge / retention:** endpoint `/api/admin/login-logs/purge` remove logs antigos de forma controlada.

```1:40:src/lib/audit/auditLogger.ts
await pool.query(`INSERT INTO audit_logs (...) VALUES (...)`, [...])
```

```396:448:src/lib/monitoring/securityMonitor.ts
export function logLoginAttempt(ipAddress: string, userAgent: string, success: boolean, userId?: string | number): void {
  securityMonitor.logEvent({ type: 'login_attempt', ... })
}
```

## 4. APIs
- **Login Logs (`src/app/api/admin/login-logs`):**
  - `GET /api/admin/login-logs` – lista logs filtrados (data, usuário, ação, sucesso/falha), suporta paginação.
  - `POST /api/admin/login-logs/purge` – exclusão parametrizada (respeita Guardian Rule de backup antes).
  - `GET /api/admin/login-logs/archived` – retorno de logs arquivados/históricos.
- **Audit (`src/app/api/admin/audit/route.ts`):**
  - `GET` com filtros de data/ação/recurso, integra com `audit_logs` e `logAuditEvent`.
- **Dashboards:** endpoints sob `/api/admin/dashboards/audit-actions` e `/login-profiles` reutilizam logs para gráficos.
- Todas as rotas protegidas por `unifiedPermissionMiddleware` e exigem permissões específicas (`login-logs`, `audit`).

```1:70:src/app/api/admin/login-logs/route.ts
const logs = await pool.query(`SELECT ... FROM login_logs WHERE ...`)
return NextResponse.json({ success: true, data: logs.rows })
```

## 5. Frontend / UX
- **Páginas admin:**
  - `src/app/admin/login-logs/page.tsx` – listagem geral.
  - `analytics/page.tsx` – dashboards analíticos (gráficos usando `src/components/admin/logs/*`).
  - `config/page.tsx` – configurações (ex.: retenção).
  - `reports/page.tsx` – export/relatórios com filtros avançados.
  - `purge/page.tsx` – interface para exclusão segura.
- **Componentes compartilhados (`src/components/admin/logs`)**: `AdvancedFilters`, `LogAnalytics`, `SecurityAlerts`, `ExportReports`, etc., integrados com hooks `useAuthenticatedFetch` e `PermissionGuard`.
- **UX Guidelines:** filtros por data/usuário/status, exportação CSV, indicadores de risco via alertas, feedback visual durante purga.

## 6. Segurança e Permissões
- **Slugs:** `login-logs` (com níveis `READ`, `EXECUTE`, `DELETE` para purge/export) e `audit` (consulta). Configurados em `system_features`.
- **Middleware:** `unifiedPermissionMiddleware` garante autenticação + permissões, e verifica `requires_2fa` quando definido.
- **Auditoria:** `logAuditEvent` deve ser chamado em operações críticas (ex.: purga), preenchendo `granted_by`/`resource` e, para eventos públicos, `userType` + `publicUserUuid` quando aplicável.
- **Rate limiting:** endpoints sensíveis devem seguir limites (ver `securityMonitor`).

## 7. Performance e Observabilidade
- Logs podem crescer rapidamente – planejar partições por data, arquivamento (`archived`), e rotinas de purga.
- Dashboards usam agregações; manter índices atualizados e considerar views/materialized views se volume aumentar.
- Monitorar tempos de resposta das rotas e uso de memória do `securityMonitor` (limpeza periódica via `clearOldEvents`).

## 8. Boas Práticas DRY / Reutilização
- Centralizar logging em `auditLogger` / `securityMonitor` (não duplicar SQL nas rotas).
- Reutilizar componentes de filtros e gráficos; evitar criar endpoints isolados sem passar por hooks existentes.
- Ao adicionar novos recursos auditáveis, consumir `logAuditEvent` para manter padrão.
- Exportações devem compartilhar utilitários de formatação (CSV/JSON) para evitar divergências.

## 9. Testes e Checklists Obrigatórios
- **Documentos:** `docs/TESTES_FASE3.md`, `docs/TESTES_DUAL_KEY_IMOVEIS_AUTOMATIZADO.md` (verificam logs), `docs/TESTES_DUAL_KEY_PROPRIETARIOS.md`, `docs/RELATORIO_PROGRESSO_REFATORACAO.md`.
- **Scripts SQL:** `database/INVESTIGACAO_COMPLETA_SESSOES.sql`, `database/INVESTIGAR_SESSOES.sql`, `database/VALIDACAO_FINAL_REMOCAO.sql` (usados para conferir integridade antes de purga).
- **Guardian Checklist:** confirmar gravação de logs em eventos críticos, validar filtros/exportações, executar purga em ambiente de teste antes de produção e garantir backup.

## 10. Dependências Cruzadas
- **Autenticação / 2FA:** logs capturam eventos de login/2FA (ver inventários correspondentes).
- **Dashboards:** utilizam dados desses logs; alteração nas colunas impacta gráficos.
- **Permissões:** menu e rotas devem estar no inventário de permissões; alterações exigem sincronização.
- **Sidebar:** itens `login-logs` e `audit` dependem desse módulo.
- **Email/Notificações:** `securityMonitor` pode gerar alertas futuros (integração planejada com notificações).

## 11. Riscos e Mitigações
- **Perda de logs:** purga mal configurada ou sem backup → seguir scripts de validação antes/após.
- **Falta de rastreabilidade:** esquecer de registrar `logAuditEvent` → incluir checagem nos code reviews.
- **Desempenho:** consultas pesadas sem índices → monitorar e ajustar.
- **Exposição de dados sensíveis:** garantir que endpoints só retornem campos necessários e estejam protegidos por permissões corretas.
- **Duplication de lógica:** evitar replicar consultas em múltiplos lugares; atualizar serviços centrais.

## 12. Plano de Atualização Contínua
1. Atualizar o inventário ao criar novas rotas/páginas de logs ou alterar estrutura das tabelas.
2. Vincular em `ANALISE_IMPACTO_LOGS_AUDITORIA.md` para qualquer mudança (purga, novos relatórios, etc.).
3. Revisão mensal de volume de logs, índices e alarmes do `securityMonitor`.
4. Planejar automação de testes (integração) validando gravação/consulta de logs em cenários críticos.
5. Reexecutar o checklist da Fase 2 do plano a cada alteração significativa (garantir colunas `public_user_uuid` e `user_id` consolidadas).

---

**Responsável pela atualização:** _(preencher)_


