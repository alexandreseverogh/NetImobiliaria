# Inventário de Dependências – Dashboards & Relatórios

**Versão:** 0.1  
**Data:** 07/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** dashboards administrativos de auditoria e imóveis, filtros analíticos, APIs agregadoras e componentes de visualização (`recharts`).
- **Objetivo:** prover visão operacional confiável (auditoria, logins, distribuição de imóveis) com segurança (`EXECUTE`), performance e aderência a Guardian Rules.
- **Componentes-chave:** página `src/app/admin/dashboards/page.tsx`, componentes `SystemDashboards` e `ImovelDashboards`, filtros compartilhados, APIs `/api/admin/dashboards/*`, permissões exclusivas (`dashboards`).

## 2. Banco de Dados e Migrações
- **Fontes de dados:**
  - `login_logs`, `audit_logs` (auditoria, perfis, tentativas)
  - `imoveis`, `tipos_imovel`, `finalidades_imovel`, `status_imovel`
  - `imoveis` campos `estado_fk`, `cidade_fk`, `bairro`, `preco`, `quartos`, `area_total`
- **Scripts relevantes:**
  - `database/create_sidebar_tables.sql` + migrações 025+ (incluem rota `dashboards` e permissões `EXECUTE`)
  - `docs/DASHBOARDS_PRONTO_PARA_TESTAR.md`, `docs/TESTES_DUAL_KEY_IMOVEIS_AUTOMATIZADO.md` (garantir integridade de dados usados nos gráficos)
- **Índices:** garantir índices em `login_logs.created_at`, `imoveis.status_fk`, `imoveis.tipo_fk`, `imoveis.finalidade_fk`, `imoveis.estado_fk` para evitar full scans.

## 3. APIs e Serviços
- **Rotas (`src/app/api/admin/dashboards`)** – todas usam `unifiedPermissionMiddleware`:
  - `audit-actions`: agrupa ações registradas em `audit_logs`.
  - `login-profiles`: contabiliza logins bem-sucedidos por perfil (`user_roles`).
  - `imoveis-*`: múltiplos endpoints (`por-tipo`, `por-finalidade`, `por-status`, `por-estado`, `por-faixa-preco`, `por-quartos`, `por-area`) com filtros dinâmicos (`start_date`, `tipo_id`, `estado_id`, etc.).
- **Filtros comuns:** datas (timestamp), IDs (convertidos para integer), textos (bairro). Todos sanitizados via parametrização (`$1`, `$2`).
- **Integrações:** utilizam `pool` (`src/lib/database/connection`) e `useAuthenticatedFetch` no front para enviar JWT em todas as chamadas.

```1:66:src/app/api/admin/dashboards/imoveis-por-tipo/route.ts
const permissionCheck = await unifiedPermissionMiddleware(request)
...
const result = await pool.query(query, params)
return NextResponse.json(result.rows)
```

## 4. Frontend / UX
- **Página principal:** `src/app/admin/dashboards/page.tsx` – envolve `PermissionGuard resource="dashboards" action="READ"`, filtros globais e dois blocos de dashboards.
- **Componentes:**
  - `DashboardFilters` – integra com `useEstadosCidades` e APIs de tipos/finalidades/status.
  - `SystemDashboards` – pie charts para auditoria e logins (usa endpoints audit/login).
  - `ImovelDashboards` – sete gráficos por categoria de imóvel.
  - `PieChartCard` – wrapper `recharts` (`PieChart`, `ResponsiveContainer`) com loading/empty states acessíveis.
- **UX Guidelines:** responsividade (grid adaptável 1–4 colunas), filtros reativos (botões aplicar/limpar, disable cidade sem estado), feedback visual (loaders/empty states).
- **Dependências externas:** `recharts` (import via `PieChart`, `Pie`, `Cell`, etc.).

```1:80:src/app/admin/dashboards/page.tsx
<PermissionGuard resource="dashboards" action="READ">
  ...
  <SystemDashboards filters={filters} refreshKey={refreshKey} />
  <ImovelDashboards filters={filters} refreshKey={refreshKey} />
</PermissionGuard>
```

## 5. Segurança e Permissões
- **Slug:** `dashboards` em `system_features` com `Crud_Execute = 'EXECUTE'` → apenas permissões `EXECUTE`/`ADMIN` garantem acesso.
- **Middleware:** todas as rotas passam por `unifiedPermissionMiddleware`, verificando JWT + 2FA quando configurado.
- **Front-end guard:** `PermissionGuard` impede renderização sem permissão; filtros só carregam dados se usuário autenticado via `useAuthenticatedFetch`.
- **Logs:** erros em APIs registram console (avaliar integração com auditoria no futuro). Uso intensivo de `login_logs`/`audit_logs` exige proteção de dados sensíveis.

## 6. Performance e Observabilidade
- Queries agregam dados por categorias → necessitam índices adequados e eventual materialized view se volume crescer.
- Sugestão: implementar caching (ex.: TTL curto) caso dashboards sejam chamados em alta frequência.
- Monitorar tempo de resposta das rotas (incluir métricas no futuro) e consumo do front (lazy load charts se preciso).
- Filtragem por datas usa `created_at` → considerar partições para `login_logs`/`audit_logs` em produção.

## 7. Boas Práticas DRY / Reutilização
- Reutilizar `buildQueryParams` em `ImovelDashboards` para todos endpoints.
- Centralizar opções (tipos, finalidades, status) em APIs próprias (`/api/admin/imoveis/*`) evitando duplicação.
- `PieChartCard` é o componente padrão para todas as visualizações circulares (manter estilo único).
- `useAuthenticatedFetch` garante headers/token automaticamente → usar em qualquer extensão.

## 8. Testes e Checklists Obrigatórios
- **Documentos:** `docs/DASHBOARDS_PRONTO_PARA_TESTAR.md`, `docs/TESTES_DUAL_KEY_IMOVEIS_AUTOMATIZADO.md`, `docs/RELATORIO_CORRECAO_LISTA_CATEGORIAS.md` (impacta filtros).
- **Scripts:** criar/rodar smoke tests verificando retornos das rotas (ex.: script PowerShell/TS).  
- **Checklist Guardian:** após alteração, validar filtros (datas, tipo, estado/cidade), comparar resultados com consultas SQL diretas e garantir que permissão `dashboards:execute` esteja ativa.

## 9. Dependências Cruzadas
- **Permissões/RBAC:** rotas dependem do slug `dashboards` (ver inventário de permissões). Alterar slug exige atualização em `PermissionGuard`, menu, e `route_permissions_config`.
- **Imóveis:** endpoints consomem dados de `imoveis` → qualquer migração/cleanup deve considerar impacto nos gráficos.
- **Login/Auditoria:** rely on `login_logs`, `audit_logs`; mudanças nesses fluxos devem sincronizar com dashboards.
- **Estados/Cidades:** filtros usam `useEstadosCidades` (JSON local). Alterações no hook impactam filtros.
- **2FA/Auth:** `useAuthenticatedFetch` exige token válido; alterações em autenticação afetam carregamento dos gráficos.

## 10. Riscos e Mitigações
- **Consultas pesadas:** sem índices, agregações escalam mal → executar planos de análise antes de grandes datasets.
- **Dados inconsistentes:** ausência de registros (ex.: tipos sem imóveis) devem ser tratados (já exibindo “Nenhum dado”).
- **Permissão incorreta:** se `Crud_Execute` configurado errado, dashboards podem exigir CRUD → validar via scripts de auditoria.
- **Dependência de JSON local:** estados/cidades vindos de arquivo; se estrutura mudar, atualizar filtros/hook.
- **Segurança:** dados sensíveis (login logs) podem vazar se permissão for concedida por engano → auditar role assignments.

## 11. Plano de Atualização Contínua
1. Atualizar o inventário ao incluir novos gráficos, filtros ou fontes de dados.
2. Referenciar este documento nas análises de impacto relacionadas a dashboards (`ANALISE_IMPACTO_DASHBOARDS.md`).
3. Revisar mensalmente desempenho das APIs e consistência de permissões.
4. Planejar automação de testes de regressão para cada endpoint antes de deploys significativos.

---

**Responsável pela atualização:** _(preencher)_


